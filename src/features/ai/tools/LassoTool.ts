import { StateNode, createShapeId, type TLPointerEventInfo, type TLShapeId } from 'tldraw'

type LassoCallback = (shapeId: TLShapeId) => void
const _callbacks = new Map<string, LassoCallback>()

export function registerLassoCallback(editorId: string, cb: LassoCallback) {
  _callbacks.set(editorId, cb)
}

export function unregisterLassoCallback(editorId: string) {
  _callbacks.delete(editorId)
}

export class LassoTool extends StateNode {
  static override id = 'lasso'
  private shapeId: TLShapeId | null = null
  private originX = 0
  private originY = 0

  override onPointerDown(_: TLPointerEventInfo) {
    const { currentPagePoint } = this.editor.inputs
    this.originX = currentPagePoint.x
    this.originY = currentPagePoint.y
    this.shapeId = createShapeId()
    this.editor.createShape({
      id: this.shapeId, type: 'geo',
      x: this.originX, y: this.originY,
      props: { geo: 'rectangle', w: 1, h: 1, fill: 'none', dash: 'dashed', color: 'blue' },
      meta: { isLasso: true },
    })
  }

  override onPointerMove() {
    if (!this.shapeId) return
    const { currentPagePoint } = this.editor.inputs
    const x = Math.min(this.originX, currentPagePoint.x)
    const y = Math.min(this.originY, currentPagePoint.y)
    const w = Math.max(1, Math.abs(currentPagePoint.x - this.originX))
    const h = Math.max(1, Math.abs(currentPagePoint.y - this.originY))
    this.editor.updateShape({ id: this.shapeId, type: 'geo', x, y, props: { w, h } })
  }

  override onPointerUp() {
    if (!this.shapeId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _callbacks.get((this.editor as any).instanceId as string)?.(this.shapeId)
    this.shapeId = null
    this.editor.setCurrentTool('select')
  }
}
