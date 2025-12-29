import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Download, Loader2, Grid3X3, Layers, FileImage, Settings2 } from "lucide-react";
import "./index.css";

type Orientation = "vertical" | "horizontal";
type PaperSize = "carta" | "oficio";

const PAGE_SIZES: Record<PaperSize, { width: number; height: number }> = {
  carta: { width: 612, height: 792 },
  oficio: { width: 612, height: 936 },
};

const getOrientedPageSize = (paperSize: PaperSize, orientation: Orientation) => {
  const base = PAGE_SIZES[paperSize];
  return orientation === "horizontal"
    ? { width: base.height, height: base.width }
    : base;
};

interface Panel {
  id: number;
  imageData: string;
  width: number;
  height: number;
  row: number;
  col: number;
  panelIndex: number;
  totalPanels: number;
}

export function App() {
  const [imageFilename, setImageFilename] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const [paperSize, setPaperSize] = useState<PaperSize>("carta");
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gridPreview, setGridPreview] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedRows = localStorage.getItem("poster-rows");
    const savedCols = localStorage.getItem("poster-cols");
    const savedOrientation = localStorage.getItem("poster-orientation") as Orientation | null;
    const savedPaperSize = localStorage.getItem("poster-paper-size") as PaperSize | null;
    const savedFilename = localStorage.getItem("poster-filename");

    const nextRows = savedRows ? parseInt(savedRows, 10) : rows;
    const nextCols = savedCols ? parseInt(savedCols, 10) : cols;
    const nextOrientation = savedOrientation ?? orientation;
    const nextPaperSize = savedPaperSize ?? paperSize;

    if (savedRows) setRows(nextRows);
    if (savedCols) setCols(nextCols);
    if (savedOrientation) setOrientation(nextOrientation);
    if (savedPaperSize) setPaperSize(nextPaperSize);
    if (savedFilename) {
      setImageFilename(savedFilename);
      generateGridPreview(savedFilename, nextRows, nextCols, nextOrientation, nextPaperSize);
    }
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "image/png") {
      setError(null);
      setPanels([]);
      setGridPreview(null);

      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/upload", { method: "POST", body: formData });

      if (!response.ok) throw new Error("Error al subir el archivo");

      const data = await response.json();
      setImageFilename(data.filename);
      localStorage.setItem("poster-filename", data.filename);

      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
      };
      img.src = `/input/${data.filename}`;

      await generateGridPreview(data.filename, rows, cols, orientation, paperSize);
    } else {
      setError("Solo archivos PNG");
    }
  };

  const generateGridPreview = async (
    filename: string,
    r: number,
    c: number,
    previewOrientation = orientation,
    previewPaperSize = paperSize
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/preview-grid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          rows: r,
          cols: c,
          orientation: previewOrientation,
          paperSize: previewPaperSize,
        }),
      });

      if (!response.ok) throw new Error("Error al generar el preview");

      const data = await response.json();
      setGridPreview(data.previewImage);
    } catch (err) {
      setError("Error al generar preview");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRowsChange = (newRows: number) => {
    setRows(newRows);
    localStorage.setItem("poster-rows", newRows.toString());
    if (imageFilename) generateGridPreview(imageFilename, newRows, cols, orientation, paperSize);
  };

  const handleColsChange = (newCols: number) => {
    setCols(newCols);
    localStorage.setItem("poster-cols", newCols.toString());
    if (imageFilename) generateGridPreview(imageFilename, rows, newCols, orientation, paperSize);
  };

  const handleOrientationChange = (value: string) => {
    if (value !== "vertical" && value !== "horizontal") return;
    const newOrientation = value;
    setOrientation(newOrientation);
    localStorage.setItem("poster-orientation", newOrientation);
    if (imageFilename) generateGridPreview(imageFilename, rows, cols, newOrientation, paperSize);
  };

  const handlePaperSizeChange = (newPaperSize: PaperSize) => {
    setPaperSize(newPaperSize);
    localStorage.setItem("poster-paper-size", newPaperSize);
    if (imageFilename) generateGridPreview(imageFilename, rows, cols, orientation, newPaperSize);
  };

  const processImage = async () => {
    if (!imageFilename) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/process-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: imageFilename, orientation, paperSize, rows, cols }),
      });

      if (!response.ok) throw new Error("Error al procesar");

      const data = await response.json();
      setPanels(data.panels);
    } catch (err) {
      setError("Error al procesar");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    if (panels.length === 0) return;
    setLoading(true);

    try {
      const response = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panels, paperSize, orientation }),
      });

      if (!response.ok) throw new Error("Error al generar PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `poster-${orientation}-${paperSize}-${rows}x${cols}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Error al exportar");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const pageSize = getOrientedPageSize(paperSize, orientation);
  const panelAspectRatio = pageSize.width / pageSize.height;
  const posterAspectRatio = (pageSize.width * cols) / (pageSize.height * rows);

  return (
    <div className="w-full h-screen flex bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
        {/* Logo */}
        <div className="h-14 border-b border-zinc-800 flex items-center px-4 gap-2">
          <Layers className="h-5 w-5 text-indigo-400" />
          <span className="font-semibold text-sm tracking-wide">POSTER STUDIO</span>
        </div>

        {/* Controls */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Source */}
          <div className="space-y-3 rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-3">
            <Label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Imagen</Label>
            <Input
              id="image-upload"
              type="file"
              accept="image/png"
              onChange={handleFileUpload}
              className="h-10 bg-zinc-950 border-zinc-600 text-zinc-100 file:bg-zinc-700 file:text-zinc-100 file:border-0 file:mr-3 file:px-3 file:rounded file:text-xs focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-0"
            />
            {imageDimensions && (
              <p className="text-xs text-zinc-400">{imageDimensions.width} × {imageDimensions.height}px</p>
            )}
          </div>

          {/* Orientation */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Orientación</Label>
            <Tabs value={orientation} onValueChange={handleOrientationChange}>
              <TabsList className="w-full bg-zinc-800 grid grid-cols-2">
                <TabsTrigger value="vertical" className="text-xs">Vertical</TabsTrigger>
                <TabsTrigger value="horizontal" className="text-xs">Horizontal</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Paper */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Tamaño</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={paperSize === "carta" ? "default" : "outline"}
                onClick={() => handlePaperSizeChange("carta")}
                className="text-xs bg-zinc-800 border-zinc-700"
              >
                Carta
              </Button>
              <Button
                variant={paperSize === "oficio" ? "default" : "outline"}
                onClick={() => handlePaperSizeChange("oficio")}
                className="text-xs bg-zinc-800 border-zinc-700"
              >
                Oficio
              </Button>
            </div>
          </div>

          {/* Grid */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Grid</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-zinc-400">Columnas</Label>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3].map((c) => (
                    <Button
                      key={c}
                      variant={cols === c ? "default" : "outline"}
                      size="sm"
                      className={`flex-1 text-xs ${cols === c ? 'bg-indigo-600' : 'bg-zinc-800 border-zinc-700'}`}
                      onClick={() => handleColsChange(c)}
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-zinc-400">Filas</Label>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3].map((r) => (
                    <Button
                      key={r}
                      variant={rows === r ? "default" : "outline"}
                      size="sm"
                      className={`flex-1 text-xs ${rows === r ? 'bg-indigo-600' : 'bg-zinc-800 border-zinc-700'}`}
                      onClick={() => handleRowsChange(r)}
                    >
                      {r}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-2">
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-sm"
              onClick={processImage}
              disabled={!imageFilename || loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Grid3X3 className="mr-2 h-4 w-4" />
              )}
              Generar Paneles
            </Button>

            <Button
              variant="default"
              className="w-full text-sm bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={exportPDF}
              disabled={panels.length === 0 || loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Exportar PDF
            </Button>

            {error && (
              <div className="p-2 bg-red-900/30 border border-red-800 rounded text-xs text-red-400">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="h-10 border-t border-zinc-800 flex items-center px-4 text-xs text-zinc-500">
          {panels.length > 0 ? (
            <span className="text-indigo-400">{rows} × {cols} = {panels.length} paneles • {orientation} {paperSize}</span>
          ) : gridPreview ? (
            <span className="text-indigo-400">{rows} × {cols} = {rows * cols} paneles (genera para ver preview)</span>
          ) : (
            <span>Sin imagen</span>
          )}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/30">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <FileImage className="h-4 w-4 text-indigo-400" />
            Preview
          </h2>
          {gridPreview && (
            <span className="text-xs text-zinc-500">
              {orientation} • {paperSize}
            </span>
          )}
        </div>

        {/* Content - Fixed container */}
        <div className="flex-1 overflow-hidden bg-zinc-950 p-6">
          {panels.length > 0 ? (
            <div 
              ref={previewContainerRef}
              className="w-full h-full flex items-center justify-center"
            >
              <div 
                className="grid gap-2 p-4 border border-zinc-700 rounded-lg bg-zinc-900 overflow-auto"
                style={{
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gridTemplateRows: `repeat(${rows}, 1fr)`,
                }}
              >
                {panels.map((panel) => (
                  <div
                    key={panel.id}
                    className="relative bg-zinc-950 rounded border border-zinc-800 overflow-hidden"
                    style={{
                      aspectRatio: panelAspectRatio,
                    }}
                  >
                    <img
                      src={panel.imageData}
                      alt={`Panel ${panel.panelIndex}`}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                      {panel.panelIndex}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : gridPreview ? (
            <div 
              ref={previewContainerRef}
              className="w-full h-full flex items-center justify-center"
            >
              <div 
                className="relative border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900"
                style={{
                  aspectRatio: posterAspectRatio,
                  maxWidth: '100%',
                  maxHeight: '100%',
                }}
              >
                <img 
                  src={gridPreview} 
                  alt="Grid preview" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-zinc-900 border-2 border-dashed border-zinc-700 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-zinc-600" />
                </div>
                <p className="text-zinc-500 text-sm">Sube una imagen para ver el preview</p>
              </div>
            </div>
          )}
        </div>

        {/* Processed Panels */}
        {panels.length > 0 && (
          <div className="h-48 border-t border-zinc-800 bg-zinc-900/30 overflow-y-auto p-4">
            <h3 className="text-xs font-medium mb-3 flex items-center gap-2">
              <Layers className="h-3 w-3 text-indigo-400" />
              Paneles Procesados ({panels.length}/{panels[0]?.totalPanels})
            </h3>
            <div className="flex gap-3">
              {panels.map((panel) => (
                <div key={panel.id} className="shrink-0 w-24 bg-zinc-900 rounded border border-zinc-800 overflow-hidden">
                  <div className="px-2 py-1 bg-zinc-800/50 text-xs text-center">
                    {panel.panelIndex}
                  </div>
                  <div className="w-full" style={{ aspectRatio: panelAspectRatio }}>
                    <img
                      src={panel.imageData}
                      alt={`Panel ${panel.panelIndex}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
