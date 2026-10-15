import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import App from "../src/App"

vi.mock("../src/api/client", () => ({
  getClientes: vi.fn().mockResolvedValue([]),
  getClientesPaged: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getProductos: vi.fn().mockResolvedValue([]),
  getProductosPaged: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getPedidosFiltered: vi.fn().mockResolvedValue([]),
  getCompras: vi.fn().mockResolvedValue([]),
  getHistorialProduccion: vi.fn().mockResolvedValue([]),
  getProformas: vi.fn().mockResolvedValue([]),
  getOptions: vi.fn().mockResolvedValue({ payments: [], orderStates: [] }),
  getReportKpis: vi.fn().mockResolvedValue({ totalVentas: 0, pedidos: 0, completados: 0, ticketPromedio: 0 }),
  getReporteRentabilidad: vi.fn().mockResolvedValue(null),
  getDashboardStats: vi
    .fn()
    .mockResolvedValue({ totalClientes: 0, totalProductos: 0, totalPedidos: 0, totalVentas: 0 }),
  getSalesChartData: vi.fn().mockResolvedValue([]),
  getTopProductsData: vi.fn().mockResolvedValue([]),
  getReorderAlerts: vi.fn().mockResolvedValue([]),
  getAlertasStock: vi.fn().mockResolvedValue({ alertasCount: 0, items: [] }),
  getDashboard: vi.fn().mockResolvedValue({}),
  login: vi.fn()
}))

describe("Navegación, Layout y Accesibilidad del Shell", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("renderiza el enlace de salto de accesibilidad (skip to content)", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App initialToken="dummy-jwt" />
      </MemoryRouter>
    )

    const skipLink = screen.getByText(/Saltar al contenido principal/i)
    expect(skipLink).toBeTruthy()
    expect(skipLink.getAttribute("href")).toBe("#main-content")
  })

  it("renderiza los enlaces de navegación principales con navegación accesible", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App initialToken="dummy-jwt" />
      </MemoryRouter>
    )

    // Enlaces visibles en la barra lateral
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Clientes").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Productos").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Pedidos").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Compras").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Producción").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Proformas").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Reportes").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Configuración").length).toBeGreaterThan(0)
  })

  it("permite abrir y cerrar el menú móvil con el botón accesible y atributo aria-expanded", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App initialToken="dummy-jwt" />
      </MemoryRouter>
    )

    const toggleBtn = screen.getByRole("button", { name: /Abrir menú de navegación/i })
    expect(toggleBtn.getAttribute("aria-expanded")).toBe("false")

    // Abrir menú
    fireEvent.click(toggleBtn)
    expect(toggleBtn.getAttribute("aria-expanded")).toBe("true")

    // Cerrar menú con el botón de cierre en el cajón
    const closeDrawerBtn = screen.getByRole("button", { name: /Cerrar menú de navegación/i })
    fireEvent.click(closeDrawerBtn)
    expect(toggleBtn.getAttribute("aria-expanded")).toBe("false")
  })

  it("permite cerrar sesión con el botón accesible", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App initialToken="dummy-jwt" />
      </MemoryRouter>
    )

    const logoutButtons = screen.getAllByRole("button", { name: /Cerrar sesión/i })
    expect(logoutButtons.length).toBeGreaterThan(0)
    fireEvent.click(logoutButtons[0])

    expect(localStorage.getItem("token")).toBeNull()
    expect(await screen.findByRole("button", { name: /Iniciar Sesión/i })).toBeTruthy()
  })
})
