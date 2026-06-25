declare module 'page-flip' {
  export interface PageFlipOptions {
    width: number
    height: number
    size?: 'fixed' | 'stretch'
    showCover?: boolean
    useMouseEvents?: boolean
    drawShadow?: boolean
    flippingTime?: number
    usePortrait?: boolean
    startPage?: number
    autoSize?: boolean
  }

  export class PageFlip {
    constructor(element: HTMLElement, options: PageFlipOptions)
    loadFromHTML(elements: NodeListOf<Element> | Element[]): void
    flipPrev(): void
    flipNext(): void
    flip(pageNum: number): void
    on(event: string, callback: (e: any) => void): void
    destroy(): void
  }
}
