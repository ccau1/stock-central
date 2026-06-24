package store

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"embed"
	"fmt"
	"strings"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

type Dashboard struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	YAML      string    `json:"yaml"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Store struct {
	pool *pgxpool.Pool
}

func New(ctx context.Context, dbURL string) (*Store, error) {
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	const maxRetries = 10
	for i := 0; i < maxRetries; i++ {
		if err := pool.Ping(ctx); err != nil {
			if i == maxRetries-1 {
				pool.Close()
				return nil, fmt.Errorf("ping db: %w", err)
			}
			time.Sleep(time.Second)
			continue
		}
		break
	}
	return &Store{pool: pool}, nil
}

func (s *Store) Close() {
	s.pool.Close()
}

func (s *Store) Migrate() error {
	d, err := iofs.New(migrationsFS, "migrations")
	if err != nil {
		return fmt.Errorf("migration source: %w", err)
	}
	connStr := s.pool.Config().ConnConfig.ConnString()
	connStr = strings.Replace(connStr, "postgres://", "pgx5://", 1)
	m, err := migrate.NewWithSourceInstance("iofs", d, connStr)
	if err != nil {
		return fmt.Errorf("migration instance: %w", err)
	}
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migrate up: %w", err)
	}
	return nil
}

type DashboardCursor struct {
	UpdatedAt time.Time `json:"u"`
	ID        uuid.UUID `json:"i"`
}

func (c DashboardCursor) Encode() string {
	b, _ := json.Marshal(c)
	return base64.StdEncoding.EncodeToString(b)
}

func ParseDashboardCursor(s string) (*DashboardCursor, error) {
	b, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		return nil, err
	}
	var c DashboardCursor
	if err := json.Unmarshal(b, &c); err != nil {
		return nil, err
	}
	if c.ID == uuid.Nil || c.UpdatedAt.IsZero() {
		return nil, fmt.Errorf("invalid cursor")
	}
	return &c, nil
}

type ListDashboardsOptions struct {
	IDs   []uuid.UUID
	After *DashboardCursor
	Before *DashboardCursor
	Limit int
}

func (s *Store) ListDashboards(ctx context.Context, opts ListDashboardsOptions) ([]Dashboard, error) {
	args := []any{}
	where := []string{}
	argIdx := 1

	if len(opts.IDs) > 0 {
		where = append(where, fmt.Sprintf("id = ANY($%d::uuid[])", argIdx))
		args = append(args, opts.IDs)
		argIdx++
	}

	if opts.After != nil {
		where = append(where, fmt.Sprintf("(updated_at, id) < ($%d, $%d)", argIdx, argIdx+1))
		args = append(args, opts.After.UpdatedAt, opts.After.ID)
		argIdx += 2
	}

	if opts.Before != nil {
		where = append(where, fmt.Sprintf("(updated_at, id) > ($%d, $%d)", argIdx, argIdx+1))
		args = append(args, opts.Before.UpdatedAt, opts.Before.ID)
		argIdx += 2
	}

	query := "SELECT id, name, yaml, created_at, updated_at FROM dashboards"
	if len(where) > 0 {
		query += " WHERE " + strings.Join(where, " AND ")
	}
	query += " ORDER BY updated_at DESC, id DESC"
	if opts.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIdx)
		args = append(args, opts.Limit)
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	dashboards := make([]Dashboard, 0)
	for rows.Next() {
		var d Dashboard
		if err := rows.Scan(&d.ID, &d.Name, &d.YAML, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		dashboards = append(dashboards, d)
	}
	return dashboards, rows.Err()
}

func (s *Store) GetDashboard(ctx context.Context, id uuid.UUID) (Dashboard, error) {
	var d Dashboard
	err := s.pool.QueryRow(ctx, `
		SELECT id, name, yaml, created_at, updated_at
		FROM dashboards
		WHERE id = $1
	`, id).Scan(&d.ID, &d.Name, &d.YAML, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return d, err
	}
	return d, nil
}

func (s *Store) CreateDashboard(ctx context.Context, name, yaml string) (Dashboard, error) {
	var d Dashboard
	err := s.pool.QueryRow(ctx, `
		INSERT INTO dashboards (name, yaml)
		VALUES ($1, $2)
		RETURNING id, name, yaml, created_at, updated_at
	`, name, yaml).Scan(&d.ID, &d.Name, &d.YAML, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return d, err
	}
	return d, nil
}

func (s *Store) UpdateDashboard(ctx context.Context, id uuid.UUID, name, yaml string) (Dashboard, error) {
	var d Dashboard
	err := s.pool.QueryRow(ctx, `
		UPDATE dashboards
		SET name = $1, yaml = $2, updated_at = NOW()
		WHERE id = $3
		RETURNING id, name, yaml, created_at, updated_at
	`, name, yaml, id).Scan(&d.ID, &d.Name, &d.YAML, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return d, err
	}
	return d, nil
}

func (s *Store) DeleteDashboard(ctx context.Context, id uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM dashboards WHERE id = $1`, id)
	return err
}

func (s *Store) CloneDashboard(ctx context.Context, id uuid.UUID, newName string) (Dashboard, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Dashboard{}, err
	}
	defer tx.Rollback(ctx)

	var yaml string
	if err := tx.QueryRow(ctx, `SELECT yaml FROM dashboards WHERE id = $1`, id).Scan(&yaml); err != nil {
		return Dashboard{}, err
	}

	var d Dashboard
	if err := tx.QueryRow(ctx, `
		INSERT INTO dashboards (name, yaml)
		VALUES ($1, $2)
		RETURNING id, name, yaml, created_at, updated_at
	`, newName, yaml).Scan(&d.ID, &d.Name, &d.YAML, &d.CreatedAt, &d.UpdatedAt); err != nil {
		return Dashboard{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return Dashboard{}, err
	}
	return d, nil
}

func (s *Store) WithTx(ctx context.Context, fn func(pgx.Tx) error) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
