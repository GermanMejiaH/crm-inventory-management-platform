import { render, screen, fireEvent } from "@testing-library/react"
import Modal from "../src/components/Modal"

describe("Componente Modal y Accesibilidad WAI-ARIA", () => {
  it("no renderiza contenido cuando isOpen es false", () => {
    render(
      <Modal isOpen={false} title="Modal Oculto" onClose={vi.fn()}>
        <p>Contenido Oculto</p>
      </Modal>
    )

    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.queryByText("Contenido Oculto")).toBeNull()
  })

  it("renderiza con role='dialog', aria-modal='true' y título vinculado", () => {
    render(
      <Modal isOpen={true} title="Título Accesible" onClose={vi.fn()}>
        <p>Contenido Visible</p>
      </Modal>
    )

    const dialog = screen.getByRole("dialog")
    expect(dialog).toBeTruthy()
    expect(dialog.getAttribute("aria-modal")).toBe("true")
    expect(dialog.getAttribute("aria-labelledby")).toBe("modal-title")
    expect(screen.getByText("Título Accesible")).toBeTruthy()
    expect(screen.getByText("Contenido Visible")).toBeTruthy()
  })

  it("llama a onClose al presionar la tecla Escape", () => {
    const handleClose = vi.fn()
    render(
      <Modal isOpen={true} title="Modal Escape" onClose={handleClose}>
        <p>Presiona Escape</p>
      </Modal>
    )

    fireEvent.keyDown(window, { key: "Escape" })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it("llama a onClose al hacer clic en el botón de cerrar accesible", () => {
    const handleClose = vi.fn()
    render(
      <Modal isOpen={true} title="Modal Cerrar" onClose={handleClose}>
        <p>Botón de Cierre</p>
      </Modal>
    )

    const closeButton = screen.getByRole("button", { name: /Cerrar modal/i })
    expect(closeButton).toBeTruthy()
    fireEvent.click(closeButton)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it("atrapa el foco dentro del diálogo al presionar Tab en el último elemento interactivo", () => {
    render(
      <Modal isOpen={true} title="Modal Focus Trap" onClose={vi.fn()}>
        <button type="button">Primer Botón</button>
        <button type="button">Segundo Botón</button>
      </Modal>
    )

    const dialog = screen.getByRole("dialog")
    const closeBtn = screen.getByRole("button", { name: /Cerrar modal/i })
    const secondBtn = screen.getByRole("button", { name: "Segundo Botón" })

    // Simular Tab desde el último elemento
    secondBtn.focus()
    expect(document.activeElement).toBe(secondBtn)

    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: false })
    // Debe ciclar al primer elemento focuseable (el botón cerrar)
    expect(document.activeElement).toBe(closeBtn)
  })
})
