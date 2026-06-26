import {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useParams, Link } from "react-router-dom";
import { marked } from "marked";
import {
  AlertTriangle,
  Banknote,
  BookOpen,
  Calculator,
  CandlestickChart,
  ChevronDown,
  ChevronRight,
  Clock,
  GraduationCap,
  Home,
  Landmark,
  Lightbulb,
  LineChart,
  Percent,
  PieChart,
  Scale,
  Search,
  Shield,
  TrendingUp,
  Wallet,
  Waypoints,
  Zap,
  type LucideIcon,
} from "lucide-react";
import config from "../education/education.json";
import IncomeFunnelDiagram from "../components/IncomeFunnelDiagram";
import type {
  EducationConfig,
  EducationGroup,
  EducationItem,
  EducationLink,
} from "../education/types";

const typedConfig = config as EducationConfig;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 64);
}

const headingRenderer = new marked.Renderer();
headingRenderer.heading = function (token) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headingToken = token as any;
  const id = slugify(headingToken.text ?? "");
  const inner = this.parser.parseInline(headingToken.tokens);
  return `<h${headingToken.depth} id="${id}" class="group relative scroll-mt-24">
  <a href="#${id}" class="no-underline text-inherit hover:text-inherit inline-flex items-center">
    ${inner}
    <span class="ml-1.5 inline-block opacity-0 group-hover:opacity-100 text-gray-400 text-sm transition-opacity select-none">¶</span>
  </a>
</h${headingToken.depth}>`;
};
marked.use({ renderer: headingRenderer });

function renderMarkdown(content: string): string {
  return marked.parse(content, { async: false }) as string;
}

function TopicIcon({
  name,
  ...props
}: { name: string } & React.ComponentProps<LucideIcon>) {
  switch (name) {
    case "AlertTriangle":
      return <AlertTriangle {...props} />;
    case "Banknote":
      return <Banknote {...props} />;
    case "BookOpen":
      return <BookOpen {...props} />;
    case "Calculator":
      return <Calculator {...props} />;
    case "CandlestickChart":
      return <CandlestickChart {...props} />;
    case "Clock":
      return <Clock {...props} />;
    case "GraduationCap":
      return <GraduationCap {...props} />;
    case "Home":
      return <Home {...props} />;
    case "Landmark":
      return <Landmark {...props} />;
    case "Lightbulb":
      return <Lightbulb {...props} />;
    case "LineChart":
      return <LineChart {...props} />;
    case "Percent":
      return <Percent {...props} />;
    case "PieChart":
      return <PieChart {...props} />;
    case "Scale":
      return <Scale {...props} />;
    case "Search":
      return <Search {...props} />;
    case "Shield":
      return <Shield {...props} />;
    case "TrendingUp":
      return <TrendingUp {...props} />;
    case "Wallet":
      return <Wallet {...props} />;
    case "Waypoints":
      return <Waypoints {...props} />;
    case "Zap":
      return <Zap {...props} />;
    default:
      return <BookOpen {...props} />;
  }
}

function normalizeKey(key: string): string {
  return key.replace(/\?raw$/, "");
}

function buildContentMap(
  modules: Record<string, string>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(modules)) {
    map.set(normalizeKey(key), value);
  }
  return map;
}

function findLinkBySlug(
  items: EducationItem[],
  slug: string
): EducationLink | undefined {
  for (const item of items) {
    if (item.type === "link") {
      if (item.slug === slug) return item;
    } else {
      const found = findLinkBySlug(item.children, slug);
      if (found) return found;
    }
  }
  return undefined;
}

function getFirstLink(items: EducationItem[]): EducationLink | undefined {
  for (const item of items) {
    if (item.type === "link") return item;
    const found = getFirstLink(item.children);
    if (found) return found;
  }
  return undefined;
}

function groupContainsSlug(
  group: EducationGroup,
  slug: string
): boolean {
  return findLinkBySlug(group.children, slug) !== undefined;
}

function collectActiveGroupPaths(
  items: EducationItem[],
  slug: string,
  path: string[] = []
): string[][] {
  const result: string[][] = [];
  for (const item of items) {
    if (item.type === "group") {
      const currentPath = [...path, item.label];
      if (groupContainsSlug(item, slug)) {
        result.push(currentPath);
      }
      result.push(...collectActiveGroupPaths(item.children, slug, currentPath));
    }
  }
  return result;
}

function pathKey(path: string[]): string {
  return path.join("/");
}

function resolveFilePath(file: string): string {
  return `../education/${file}`;
}

interface SidebarProps {
  items: EducationItem[];
  activeSlug: string;
  expanded: Set<string>;
  toggleGroup: (path: string[]) => void;
  depth?: number;
  path?: string[];
}

function Sidebar({
  items,
  activeSlug,
  expanded,
  toggleGroup,
  depth = 0,
  path = [],
}: SidebarProps) {
  return (
    <ul className="flex flex-col">
      {items.map((item, index) => {
        const key = `${pathKey(path)}-${index}`;
        if (item.type === "link") {
          const active = item.slug === activeSlug;
          return (
            <li key={key}>
              <Link
                to={`/education/${item.slug}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                } ${depth > 0 ? `ml-${depth * 3}` : ""}`}
                style={{ marginLeft: depth > 0 ? `${depth * 12}px` : undefined }}
              >
                {item.icon && (
                  <TopicIcon
                    name={item.icon}
                    size={14}
                    className={active ? "text-blue-600" : "text-gray-500"}
                  />
                )}
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        }

        const currentPath = [...path, item.label];
        const currentKey = pathKey(currentPath);
        const isExpanded = expanded.has(currentKey);
        const hasActiveChild = groupContainsSlug(item, activeSlug);
        const activeGroup = isExpanded || hasActiveChild;

        return (
          <li key={key} className="flex flex-col">
            <button
              type="button"
              onClick={() => toggleGroup(currentPath)}
              className={`flex items-center justify-between w-full gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeGroup
                  ? "text-blue-700 hover:bg-blue-50"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              style={{ marginLeft: depth > 0 ? `${depth * 12}px` : undefined }}
            >
              <span className="flex items-center gap-2 truncate">
                {item.icon && (
                  <TopicIcon
                    name={item.icon}
                    size={14}
                    className={activeGroup ? "text-blue-600" : "text-gray-500"}
                  />
                )}
                <span className="truncate">{item.label}</span>
              </span>
              {isExpanded ? (
                <ChevronDown size={14} className="shrink-0 text-gray-400" />
              ) : (
                <ChevronRight size={14} className="shrink-0 text-gray-400" />
              )}
            </button>
            {isExpanded && (
              <div className="mt-0.5">
                <Sidebar
                  items={item.children}
                  activeSlug={activeSlug}
                  expanded={expanded}
                  toggleGroup={toggleGroup}
                  depth={depth + 1}
                  path={currentPath}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function EducationPage() {
  const { slug } = useParams<{ slug?: string }>();

  const markdownModules = useMemo(
    () =>
      import.meta.glob<string>("../education/**/*.md", {
        eager: true,
        query: "?raw",
        import: "default",
      }),
    []
  );
  const contentMap = useMemo(
    () => buildContentMap(markdownModules),
    [markdownModules]
  );

  const activeLink = useMemo(() => {
    if (!slug) return getFirstLink(typedConfig.items);
    return findLinkBySlug(typedConfig.items, slug) ?? getFirstLink(typedConfig.items);
  }, [slug]);

  const activeSlug = activeLink?.slug ?? "";

  const [userExpanded, setUserExpanded] = useState<Set<string>>(new Set());

  const autoExpanded = useMemo(() => {
    const paths = collectActiveGroupPaths(typedConfig.items, activeSlug);
    return new Set(paths.map(pathKey));
  }, [activeSlug]);

  const expanded = useMemo(
    () => new Set([...userExpanded, ...autoExpanded]),
    [userExpanded, autoExpanded]
  );

  const toggleGroup = useCallback((path: string[]) => {
    const key = pathKey(path);
    setUserExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const mainRef = useRef<HTMLElement>(null);

  const rawContent = activeLink
    ? contentMap.get(resolveFilePath(activeLink.file))
    : undefined;
  const html = useMemo(
    () =>
      renderMarkdown(
        rawContent ?? "# Page not found\n\nThis education page is missing."
      ),
    [rawContent]
  );

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const hash = window.location.hash.slice(1);
    if (hash) {
      const element = document.getElementById(hash);
      if (element) {
        const top =
          element.getBoundingClientRect().top -
          main.getBoundingClientRect().top +
          main.scrollTop -
          16;
        main.scrollTop = Math.max(0, top);
      }
    } else {
      main.scrollTop = 0;
    }
  }, [activeSlug, html]);

  const diagramPlaceholder = "<!-- INCOME_FUNNEL_DIAGRAM -->";
  const hasDiagram = html.includes(diagramPlaceholder);
  const [htmlBefore, htmlAfter] = hasDiagram
    ? html.split(diagramPlaceholder)
    : [html, ""];

  return (
    <div className="min-h-full bg-gray-50 lg:h-full lg:flex lg:flex-col lg:overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] min-h-full lg:flex-1 lg:min-h-0">
        {/* Sidebar */}
        <aside className="bg-white border-b lg:border-b-0 lg:border-r border-gray-200 p-4 lg:overflow-y-auto">
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={20} className="text-blue-600" />
              <h1 className="text-base font-bold text-gray-900">
                {typedConfig.title}
              </h1>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              {typedConfig.description}
            </p>
          </div>
          <Sidebar
            items={typedConfig.items}
            activeSlug={activeSlug}
            expanded={expanded}
            toggleGroup={toggleGroup}
          />
        </aside>

        {/* Content */}
        <main
          ref={mainRef}
          className="p-4 sm:p-6 lg:p-8 min-w-0 lg:overflow-y-auto scroll-smooth"
        >
          <article className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-8">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
              {activeLink?.icon && (
                <TopicIcon
                  name={activeLink.icon}
                  size={18}
                  className="text-blue-600"
                />
              )}
              <h2 className="text-lg font-semibold text-gray-900">
                {activeLink?.label ?? "Education"}
              </h2>
            </div>
            {hasDiagram ? (
              <>
                <div
                  className="prose prose-sm sm:prose-base max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-strong:text-gray-900 prose-table:text-xs sm:prose-table:text-sm prose-th:bg-gray-50 prose-th:font-semibold prose-td:border-gray-100 prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg"
                  dangerouslySetInnerHTML={{ __html: htmlBefore }}
                />
                <IncomeFunnelDiagram />
                <div
                  className="prose prose-sm sm:prose-base max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-strong:text-gray-900 prose-table:text-xs sm:prose-table:text-sm prose-th:bg-gray-50 prose-th:font-semibold prose-td:border-gray-100 prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg"
                  dangerouslySetInnerHTML={{ __html: htmlAfter }}
                />
              </>
            ) : (
              <div
                className="prose prose-sm sm:prose-base max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-strong:text-gray-900 prose-table:text-xs sm:prose-table:text-sm prose-th:bg-gray-50 prose-th:font-semibold prose-td:border-gray-100 prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )}
          </article>
        </main>
      </div>
    </div>
  );
}
