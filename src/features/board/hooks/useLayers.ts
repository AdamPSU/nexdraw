"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Editor } from "tldraw";

export type Layer = {
  id: string;
  name: string;
  order: number;
  isVisible: boolean;
  isLocked: boolean;
};

const readLayers = (editor: Editor): Layer[] => {
  const meta = editor.getCurrentPage().meta as any;
  return meta?.layers ?? [];
};

const writeLayers = (editor: Editor, layers: Layer[]) => {
  const page = editor.getCurrentPage();
  editor.updatePage({ id: page.id, meta: { ...page.meta, layers } });
};

export function useLayers(editor: Editor) {
  const [layers, setLayersState] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerIdState] = useState<string>("");
  const activeLayerIdRef = useRef("");

  const setActiveLayerId = (id: string) => {
    setActiveLayerIdState(id);
    activeLayerIdRef.current = id;
  };

  // Migration: create Layer 1 if none, assign untagged shapes
  useEffect(() => {
    if (!editor) return;
    const existing = readLayers(editor);
    if (existing.length > 0) {
      setLayersState(existing);
      const topId = existing[existing.length - 1].id;
      setActiveLayerIdState(topId);
      activeLayerIdRef.current = topId;
      return;
    }
    const layer1: Layer = { id: crypto.randomUUID(), name: "Layer 1", order: 0, isVisible: true, isLocked: false };
    editor.run(() => {
      writeLayers(editor, [layer1]);
      for (const shapeId of [...editor.getCurrentPageShapeIds()]) {
        const shape = editor.getShape(shapeId);
        if (shape && !(shape.meta as any)?.layerId) {
          editor.updateShape({ id: shapeId, type: shape.type, meta: { ...shape.meta, layerId: layer1.id } });
        }
      }
    });
    setLayersState([layer1]);
    setActiveLayerIdState(layer1.id);
    activeLayerIdRef.current = layer1.id;
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for newly added shapes and tag them with activeLayerId
  useEffect(() => {
    if (!editor) return;
    const dispose = editor.store.listen((entry) => {
      const added = Object.values(entry.changes.added).filter(
        (r: any) => r.typeName === "shape" && !(r.meta as any)?.layerId
      );
      if (added.length === 0) return;
      for (const shape of added as any[]) {
        editor.updateShape({
          id: shape.id,
          type: shape.type,
          meta: { ...shape.meta, layerId: activeLayerIdRef.current },
        });
      }
    }, { scope: "document" });
    return dispose;
  }, [editor]);

  const addLayer = useCallback(() => {
    const current = readLayers(editor);
    const newLayer: Layer = {
      id: crypto.randomUUID(),
      name: `Layer ${current.length + 1}`,
      order: current.length,
      isVisible: true,
      isLocked: false,
    };
    const next = [...current, newLayer];
    writeLayers(editor, next);
    setLayersState(next);
    setActiveLayerId(newLayer.id);
  }, [editor]);

  const deleteLayer = useCallback((layerId: string) => {
    const current = readLayers(editor);
    if (current.length <= 1) return;
    const shapeIds = [...editor.getCurrentPageShapeIds()].filter(id => {
      return (editor.getShape(id)?.meta as any)?.layerId === layerId;
    });
    editor.deleteShapes(shapeIds);
    const next = current.filter(l => l.id !== layerId).map((l, i) => ({ ...l, order: i }));
    writeLayers(editor, next);
    setLayersState(next);
    if (activeLayerIdRef.current === layerId) {
      setActiveLayerId(next[next.length - 1]?.id ?? "");
    }
  }, [editor]);

  const renameLayer = useCallback((layerId: string, name: string) => {
    const next = readLayers(editor).map(l => l.id === layerId ? { ...l, name } : l);
    writeLayers(editor, next);
    setLayersState(next);
  }, [editor]);

  const toggleVisibility = useCallback((layerId: string) => {
    const current = readLayers(editor);
    const layer = current.find(l => l.id === layerId);
    if (!layer) return;
    const nowVisible = !layer.isVisible;
    const next = current.map(l => l.id === layerId ? { ...l, isVisible: nowVisible } : l);
    writeLayers(editor, next);
    setLayersState(next);
    const shapeIds = [...editor.getCurrentPageShapeIds()].filter(id =>
      (editor.getShape(id)?.meta as any)?.layerId === layerId
    );
    editor.run(() => {
      for (const shapeId of shapeIds) {
        const shape = editor.getShape(shapeId);
        if (!shape) continue;
        if (!nowVisible) {
          const origOpacity = shape.opacity ?? 1;
          editor.updateShape({ id: shapeId, type: shape.type, opacity: 0, isLocked: true, meta: { ...shape.meta, _origOpacity: origOpacity } });
        } else {
          const { _origOpacity, ...restMeta } = shape.meta as any;
          editor.updateShape({ id: shapeId, type: shape.type, opacity: _origOpacity ?? 1, isLocked: false, meta: restMeta });
        }
      }
    });
  }, [editor]);

  const toggleLock = useCallback((layerId: string) => {
    const current = readLayers(editor);
    const layer = current.find(l => l.id === layerId);
    if (!layer) return;
    const nowLocked = !layer.isLocked;
    const next = current.map(l => l.id === layerId ? { ...l, isLocked: nowLocked } : l);
    writeLayers(editor, next);
    setLayersState(next);
    const shapeIds = [...editor.getCurrentPageShapeIds()].filter(id =>
      (editor.getShape(id)?.meta as any)?.layerId === layerId
    );
    editor.run(() => {
      for (const shapeId of shapeIds) {
        const shape = editor.getShape(shapeId);
        if (!shape) continue;
        editor.updateShape({ id: shapeId, type: shape.type, isLocked: nowLocked });
      }
    });
  }, [editor]);

  const reorderLayers = useCallback((newOrder: Layer[]) => {
    const next = newOrder.map((l, i) => ({ ...l, order: i }));
    writeLayers(editor, next);
    setLayersState(next);
    for (const layer of next) {
      const shapeIds = [...editor.getCurrentPageShapeIds()].filter(id =>
        (editor.getShape(id)?.meta as any)?.layerId === layer.id
      );
      if (shapeIds.length > 0) editor.bringToFront(shapeIds);
    }
  }, [editor]);

  return { layers, activeLayerId, setActiveLayerId, addLayer, deleteLayer, renameLayer, toggleVisibility, toggleLock, reorderLayers };
}
