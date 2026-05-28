package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"gopkg.in/yaml.v3"

	"stockcentral/internal/store"
)

type API struct {
	store      *store.Store
	corsOrigin string
}

func New(s *store.Store, corsOrigin string) http.Handler {
	a := &API{store: s, corsOrigin: corsOrigin}
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{corsOrigin},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Requested-With"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/health", a.health)

	r.Route("/api/v1/dashboards", func(r chi.Router) {
		r.Get("/", a.listDashboards)
		r.Post("/", a.createDashboard)
		r.Route("/{id}", func(r chi.Router) {
			r.Use(a.dashboardCtx)
			r.Get("/", a.getDashboard)
			r.Put("/", a.updateDashboard)
			r.Delete("/", a.deleteDashboard)
			r.Post("/clone", a.cloneDashboard)
		})
	})

	r.Route("/api/v1/data", func(r chi.Router) {
		a.dataRoutes(r)
	})

	r.Route("/api/v1/tickers", func(r chi.Router) {
		a.tickerRoutes(r)
	})

	return r
}

func (a *API) health(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *API) listDashboards(w http.ResponseWriter, r *http.Request) {
	dashboards, err := a.store.ListDashboards(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	respondJSON(w, http.StatusOK, dashboards)
}

type createDashboardRequest struct {
	Name string `json:"name"`
	YAML string `json:"yaml"`
}

func (a *API) createDashboard(w http.ResponseWriter, r *http.Request) {
	var req createDashboardRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, fmt.Errorf("invalid json: %w", err))
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		respondError(w, http.StatusBadRequest, errors.New("name is required"))
		return
	}
	yamlStr := strings.TrimSpace(req.YAML)
	if yamlStr == "" {
		respondError(w, http.StatusBadRequest, errors.New("yaml is required"))
		return
	}
	if err := validateDashboardYAML(yamlStr); err != nil {
		respondError(w, http.StatusBadRequest, fmt.Errorf("invalid yaml: %w", err))
		return
	}

	d, err := a.store.CreateDashboard(r.Context(), name, yamlStr)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	respondJSON(w, http.StatusCreated, d)
}

func (a *API) getDashboard(w http.ResponseWriter, r *http.Request) {
	d := r.Context().Value(ctxKeyDashboard).(store.Dashboard)
	respondJSON(w, http.StatusOK, d)
}

type updateDashboardRequest struct {
	Name string `json:"name"`
	YAML string `json:"yaml"`
}

func (a *API) updateDashboard(w http.ResponseWriter, r *http.Request) {
	d := r.Context().Value(ctxKeyDashboard).(store.Dashboard)
	var req updateDashboardRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, fmt.Errorf("invalid json: %w", err))
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		respondError(w, http.StatusBadRequest, errors.New("name is required"))
		return
	}
	yamlStr := strings.TrimSpace(req.YAML)
	if yamlStr == "" {
		respondError(w, http.StatusBadRequest, errors.New("yaml is required"))
		return
	}
	if err := validateDashboardYAML(yamlStr); err != nil {
		respondError(w, http.StatusBadRequest, fmt.Errorf("invalid yaml: %w", err))
		return
	}

	updated, err := a.store.UpdateDashboard(r.Context(), d.ID, name, yamlStr)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	respondJSON(w, http.StatusOK, updated)
}

func (a *API) deleteDashboard(w http.ResponseWriter, r *http.Request) {
	d := r.Context().Value(ctxKeyDashboard).(store.Dashboard)
	if err := a.store.DeleteDashboard(r.Context(), d.ID); err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type cloneDashboardRequest struct {
	Name string `json:"name"`
}

func (a *API) cloneDashboard(w http.ResponseWriter, r *http.Request) {
	d := r.Context().Value(ctxKeyDashboard).(store.Dashboard)
	var req cloneDashboardRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, fmt.Errorf("invalid json: %w", err))
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		respondError(w, http.StatusBadRequest, errors.New("name is required"))
		return
	}
	cloned, err := a.store.CloneDashboard(r.Context(), d.ID, name)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err)
		return
	}
	respondJSON(w, http.StatusCreated, cloned)
}

// ---- middleware ----

type contextKey string

const ctxKeyDashboard contextKey = "dashboard"

func (a *API) dashboardCtx(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		idStr := chi.URLParam(r, "id")
		id, err := uuid.Parse(idStr)
		if err != nil {
			respondError(w, http.StatusBadRequest, errors.New("invalid dashboard id"))
			return
		}
		d, err := a.store.GetDashboard(r.Context(), id)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				respondError(w, http.StatusNotFound, errors.New("dashboard not found"))
				return
			}
			respondError(w, http.StatusInternalServerError, err)
			return
		}
		ctx := r.Context()
		ctx = context.WithValue(ctx, ctxKeyDashboard, d)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// ---- helpers ----

func respondJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		slog := struct{ Error string }{Error: err.Error()}
		json.NewEncoder(w).Encode(slog)
	}
}

func respondError(w http.ResponseWriter, status int, err error) {
	respondJSON(w, status, map[string]string{"error": err.Error()})
}

func decodeJSON(r *http.Request, v any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}

func validateDashboardYAML(s string) error {
	var doc map[string]any
	if err := yaml.Unmarshal([]byte(s), &doc); err != nil {
		return err
	}
	required := []string{"id", "name", "panels"}
	for _, key := range required {
		if _, ok := doc[key]; !ok {
			return fmt.Errorf("missing required field: %s", key)
		}
	}
	return nil
}
