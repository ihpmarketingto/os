"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  Image as ImageIcon,
  Save,
  Square as SquareIcon,
  Trash2,
  Type as TypeIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getDesignUploadPaths, registerDesignExport, saveDesignCanvas } from "./actions";

/** IHP brand kit, available as one-click swatches in the editor. */
const BRAND_SWATCHES = [
  { name: "Wine Plum", hex: "#622249" },
  { name: "Plum Deep", hex: "#310C25" },
  { name: "Gold", hex: "#C89B41" },
  { name: "Cream", hex: "#F8F6F2" },
  { name: "Charcoal", hex: "#21242C" },
  { name: "White", hex: "#FFFFFF" },
];

const BRAND_FONTS = [
  { label: "Times New Roman (headings)", value: "Times New Roman" },
  { label: "Roboto (body)", value: "Roboto" },
  { label: "Georgia", value: "Georgia" },
  { label: "Arial", value: "Arial" },
];

export interface AssetChoice {
  id: string;
  name: string;
  url: string;
  origin: "uploaded" | "ai_generated";
}

interface LayerInfo {
  index: number;
  label: string;
  type: string;
  selected: boolean;
}

export function DesignEditor({
  designId,
  width,
  height,
  initialCanvas,
  assets,
}: {
  designId: string;
  width: number;
  height: number;
  initialCanvas: unknown;
  assets: AssetChoice[];
}) {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const [layers, setLayers] = useState<LayerInfo[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFill, setSelectedFill] = useState("#622249");

  const refreshLayers = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    const objects = canvas.getObjects();
    setLayers(
      objects
        .map((obj, index) => ({
          index,
          type: obj.type ?? "object",
          label:
            obj.type === "textbox" || obj.type === "i-text"
              ? `Text: ${String((obj as fabric.Textbox).text ?? "").slice(0, 24)}`
              : obj.type === "image"
                ? "Image"
                : obj.type === "rect"
                  ? "Rectangle"
                  : obj.type === "circle"
                    ? "Circle"
                    : (obj.type ?? "Layer"),
          selected: obj === active,
        }))
        .reverse(),
    );
  }, []);

  // Initialise the canvas once, restoring any saved layer state.
  useEffect(() => {
    if (!canvasElRef.current || fabricRef.current) return;

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width,
      height,
      backgroundColor: "#FFFFFF",
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    const saved = initialCanvas as { objects?: unknown[] } | null;
    if (saved && Array.isArray(saved.objects) && saved.objects.length > 0) {
      canvas
        .loadFromJSON(saved)
        .then(() => {
          canvas.renderAll();
          refreshLayers();
        })
        .catch(() => toast.error("Could not restore this design's layers."));
    }

    for (const event of ["object:added", "object:removed", "object:modified", "selection:created", "selection:updated", "selection:cleared"] as const) {
      canvas.on(event, refreshLayers);
    }

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [width, height, initialCanvas, refreshLayers]);

  // Fit the canvas into the available width without changing its real pixels.
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const container = canvasElRef.current?.parentElement?.parentElement;
    if (!container) return;
    const applyZoom = () => {
      const available = container.clientWidth - 32;
      const scale = Math.min(1, available / width);
      canvas.setZoom(scale);
      canvas.setDimensions({ width: width * scale, height: height * scale });
      canvas.renderAll();
    };
    applyZoom();
    const observer = new ResizeObserver(applyZoom);
    observer.observe(container);
    return () => observer.disconnect();
  }, [width, height]);

  const withCanvas = (fn: (canvas: fabric.Canvas) => void) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    fn(canvas);
    canvas.renderAll();
    refreshLayers();
  };

  const addText = () =>
    withCanvas((canvas) => {
      const text = new fabric.Textbox("Your headline", {
        left: width * 0.1,
        top: height * 0.1,
        width: width * 0.8,
        fontSize: Math.round(width / 16),
        fill: selectedFill,
        fontFamily: "Times New Roman",
      });
      canvas.add(text);
      canvas.setActiveObject(text);
    });

  const addRect = () =>
    withCanvas((canvas) => {
      const rect = new fabric.Rect({
        left: width * 0.1,
        top: height * 0.5,
        width: width * 0.5,
        height: height * 0.15,
        fill: selectedFill,
      });
      canvas.add(rect);
      canvas.setActiveObject(rect);
    });

  const addImage = async (url: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    try {
      const img = await fabric.FabricImage.fromURL(url, { crossOrigin: "anonymous" });
      const scale = Math.min(width / (img.width ?? width), height / (img.height ?? height));
      img.set({ left: 0, top: 0, scaleX: scale, scaleY: scale });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      refreshLayers();
    } catch {
      toast.error("Could not load that asset onto the canvas.");
    }
  };

  const applyFill = (hex: string) => {
    setSelectedFill(hex);
    withCanvas((canvas) => {
      const active = canvas.getActiveObject();
      if (active) active.set("fill", hex);
    });
  };

  const applyFont = (font: string) =>
    withCanvas((canvas) => {
      const active = canvas.getActiveObject();
      if (active && (active.type === "textbox" || active.type === "i-text")) {
        (active as fabric.Textbox).set("fontFamily", font);
      }
    });

  const setBackground = (hex: string) =>
    withCanvas((canvas) => {
      canvas.backgroundColor = hex;
    });

  const removeSelected = () =>
    withCanvas((canvas) => {
      for (const obj of canvas.getActiveObjects()) canvas.remove(obj);
      canvas.discardActiveObject();
    });

  const duplicateSelected = async () => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    const clone = await active.clone();
    clone.set({ left: (active.left ?? 0) + 24, top: (active.top ?? 0) + 24 });
    canvas.add(clone);
    canvas.setActiveObject(clone);
    canvas.renderAll();
    refreshLayers();
  };

  const moveLayer = (direction: "up" | "down") =>
    withCanvas((canvas) => {
      const active = canvas.getActiveObject();
      if (!active) return;
      if (direction === "up") canvas.bringObjectForward(active);
      else canvas.sendObjectBackwards(active);
    });

  const selectLayer = (index: number) =>
    withCanvas((canvas) => {
      const obj = canvas.getObjects()[index];
      if (obj) canvas.setActiveObject(obj);
    });

  /**
   * Renders the canvas at `scale` x the design's true pixel size. Fabric's
   * multiplier is relative to the element's current (zoomed, retina-scaled)
   * dimensions, so deriving it from getWidth() keeps output exact at any zoom
   * and on any display.
   */
  const renderBlob = async (canvas: fabric.Canvas, scale: number): Promise<Blob> => {
    const multiplier = (width * scale) / canvas.getWidth();
    const dataUrl = canvas.toDataURL({ format: "png", multiplier });
    return await (await fetch(dataUrl)).blob();
  };

  /**
   * A full-size PNG runs to several megabytes, past the server action body
   * limit, so the browser uploads it to storage directly and the action only
   * ever handles the path.
   */
  const uploadPng = async (blob: Blob, path: string): Promise<string | null> => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.storage
      .from("creative")
      .upload(path, blob, { contentType: "image/png", upsert: true });
    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      return null;
    }
    return path;
  };

  const save = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setIsSaving(true);
    try {
      const json = canvas.toJSON();
      const paths = await getDesignUploadPaths(designId);
      if (paths.error || !paths.thumbnailPath) {
        toast.error(paths.error ?? "Could not save this design.");
        return;
      }
      const thumbnail = await renderBlob(canvas, 0.25);
      const thumbnailPath = await uploadPng(thumbnail, paths.thumbnailPath);
      const result = await saveDesignCanvas(designId, json, thumbnailPath ?? undefined);
      if (result.error) toast.error(result.error);
      else toast.success("Design saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const exportPng = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setIsSaving(true);
    try {
      const paths = await getDesignUploadPaths(designId);
      if (paths.error || !paths.exportPath) {
        toast.error(paths.error ?? "Could not export this design.");
        return;
      }
      canvas.discardActiveObject();
      canvas.renderAll();
      const blob = await renderBlob(canvas, 1);
      const uploaded = await uploadPng(blob, paths.exportPath);
      if (!uploaded) return;
      const result = await registerDesignExport(designId, uploaded);
      if (result.error) toast.error(result.error);
      else toast.success(`Exported ${width} x ${height} to the asset library.`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr_220px]">
      {/* Tools */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Add</Label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={addText}>
              <TypeIcon className="mr-1 size-3.5" /> Text
            </Button>
            <Button size="sm" variant="outline" onClick={addRect}>
              <SquareIcon className="mr-1 size-3.5" /> Shape
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Brand colours</Label>
          <div className="flex flex-wrap gap-1.5">
            {BRAND_SWATCHES.map((swatch) => (
              <button
                key={swatch.hex}
                title={`${swatch.name} — click to fill selection`}
                onClick={() => applyFill(swatch.hex)}
                className="size-7 rounded-md border"
                style={{ backgroundColor: swatch.hex }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Input
              type="color"
              value={selectedFill}
              onChange={(e) => applyFill(e.target.value)}
              className="h-8 w-14 p-1"
            />
            <Button size="sm" variant="ghost" onClick={() => setBackground(selectedFill)}>
              Set background
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="font-select" className="text-xs uppercase tracking-wide text-muted-foreground">
            Font
          </Label>
          <select
            id="font-select"
            onChange={(e) => applyFont(e.target.value)}
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            {BRAND_FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            <ImageIcon className="mr-1 inline size-3.5" /> Assets
          </Label>
          {assets.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No assets yet. Generate or upload one, then click it to place it on the canvas.
            </p>
          ) : (
            <div className="grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => addImage(asset.url)}
                  title={`${asset.name}${asset.origin === "ai_generated" ? " (AI generated)" : ""}`}
                  className="relative aspect-square overflow-hidden rounded-md border hover:border-brand"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.url} alt={asset.name} className="size-full object-cover" />
                  {asset.origin === "ai_generated" ? (
                    <span className="absolute bottom-0 right-0 bg-brand px-1 text-[8px] font-bold text-brand-foreground">
                      AI
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={save} disabled={isSaving}>
            <Save className="mr-1 size-3.5" /> {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" variant="outline" onClick={exportPng} disabled={isSaving}>
            <Download className="mr-1 size-3.5" /> Export PNG
          </Button>
          <Button size="sm" variant="ghost" onClick={duplicateSelected}>
            <Copy className="mr-1 size-3.5" /> Duplicate
          </Button>
          <Button size="sm" variant="ghost" onClick={() => moveLayer("up")}>
            <ArrowUp className="mr-1 size-3.5" /> Forward
          </Button>
          <Button size="sm" variant="ghost" onClick={() => moveLayer("down")}>
            <ArrowDown className="mr-1 size-3.5" /> Back
          </Button>
          <Button size="sm" variant="ghost" onClick={removeSelected}>
            <Trash2 className="mr-1 size-3.5" /> Delete
          </Button>
        </div>
        <div className="flex justify-center rounded-lg border bg-muted/30 p-4">
          <canvas ref={canvasElRef} className="max-w-full rounded shadow-sm" />
        </div>
        <p className="text-xs text-muted-foreground">
          {width} x {height} pixels. Double-click text to edit it. Drag the handles to resize and rotate.
        </p>
      </div>

      {/* Layers */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Layers</Label>
        {layers.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing on the canvas yet.</p>
        ) : (
          <ul className="space-y-1">
            {layers.map((layer) => (
              <li key={layer.index}>
                <button
                  onClick={() => selectLayer(layer.index)}
                  className={`w-full truncate rounded-md border px-2 py-1.5 text-left text-xs ${
                    layer.selected ? "border-brand bg-brand/10 font-medium" : "hover:bg-muted"
                  }`}
                >
                  {layer.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="pt-2 text-xs text-muted-foreground">
          Topmost layer sits at the top of this list.
        </p>
      </div>
    </div>
  );
}
