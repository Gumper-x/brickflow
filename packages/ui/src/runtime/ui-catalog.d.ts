declare module '#brickflow-ui-catalog' {
  import type { Component } from 'vue'

  export interface BrickflowUiComponent {
    component: Component
    demos: BrickflowUiDemo[]
    id: string
    name: string
    props: BrickflowUiProp[]
    slots: string[]
    styles: BrickflowUiStyleValue[]
  }

  export interface BrickflowUiDemo {
    code: string
    component: Component
    description?: string
    id: string
    title: string
  }

  export interface BrickflowUiDemoMeta {
    description?: string
    title?: string
  }

  export interface BrickflowUiProp {
    name: string
    required: boolean
    type: string
  }

  export interface BrickflowUiStyleValue {
    path: string
    value?: string
  }

  export const uiComponents: BrickflowUiComponent[]
}
