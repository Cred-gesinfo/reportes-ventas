"use client";

// Abre el cuadro de impresion del navegador: elige "Guardar como PDF" para obtener el reporte en PDF.
export function BotonImprimir() {
  return (
    <button type="button" className="no-print btn-imprimir" onClick={() => window.print()}>
      Imprimir / PDF
    </button>
  );
}
