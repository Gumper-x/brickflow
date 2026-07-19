<script lang="ts">
  export const uiDemo = {
    title: 'Color & Variants',
  }
</script>

<script lang="ts" setup>
  import Button from './index.vue'
</script>

<template>
  <div class="relative pl-13 flex flex-col flex-wrap items-start gap-3 w-fit">
    <div class="absolute left-0 pl-13 pt-7 z-0 top-0 w-full h-full object-cover">
      <img
        src="https://picsum.photos/1000/1000"
        class="rounded-xl z-0 top-0 w-full h-full object-cover opacity-50"
      />
    </div>
    <div class="flex flex-wrap justify-around w-full items-center gap-3 text-plain-600 text-xs">
      <span>solid</span>
      <span>ghost</span>
      <span>glass</span>
      <span>soft</span>
      <span>subtle</span>
    </div>
    <div
      class="absolute top-0 left-0 flex flex-col justify-around h-full pt-7 items-center gap-3 text-plain-600 text-xs"
    >
      <span>main</span>
      <span>plain</span>
      <span>alt</span>
      <span>danger</span>
      <span>info</span>
      <span>warn</span>
      <span>win</span>
    </div>
    <div class="p-2 flex flex-wrap items-center gap-3">
      <Button>Button</Button>
      <Button variant="ghost">Button</Button>
      <Button variant="glass">Button</Button>
      <Button variant="soft">Button</Button>
      <Button variant="subtle">Button</Button>
    </div>
    <div class="p-2 flex flex-wrap items-center gap-3">
      <Button color="plain">Button</Button>
      <Button
        color="plain"
        variant="ghost"
      >
        Button
      </Button>
      <Button
        color="plain"
        variant="glass"
      >
        Button
      </Button>
      <Button
        color="plain"
        variant="soft"
      >
        Button
      </Button>
      <Button
        color="plain"
        variant="subtle"
      >
        Button
      </Button>
    </div>
    <div class="p-2 flex flex-wrap items-center gap-3">
      <Button color="alt">Button</Button>
      <Button
        color="alt"
        variant="ghost"
      >
        Button
      </Button>
      <Button
        color="alt"
        variant="glass"
      >
        Button
      </Button>
      <Button
        color="alt"
        variant="soft"
      >
        Button
      </Button>
      <Button
        color="alt"
        variant="subtle"
      >
        Button
      </Button>
    </div>
    <div class="p-2 flex flex-wrap items-center gap-3">
      <Button color="danger">Button</Button>
      <Button
        color="danger"
        variant="ghost"
      >
        Button
      </Button>
      <Button
        color="danger"
        variant="glass"
      >
        Button
      </Button>
      <Button
        color="danger"
        variant="soft"
      >
        Button
      </Button>
      <Button
        color="danger"
        variant="subtle"
      >
        Button
      </Button>
    </div>
    <div class="p-2 flex flex-wrap items-center gap-3">
      <Button color="info">Button</Button>
      <Button
        color="info"
        variant="ghost"
      >
        Button
      </Button>
      <Button
        color="info"
        variant="glass"
      >
        Button
      </Button>
      <Button
        color="info"
        variant="soft"
      >
        Button
      </Button>
      <Button
        color="info"
        variant="subtle"
      >
        Button
      </Button>
    </div>
    <div class="p-2 flex flex-wrap items-center gap-3">
      <Button color="warn">Button</Button>
      <Button
        color="warn"
        variant="ghost"
      >
        Button
      </Button>
      <Button
        color="warn"
        variant="glass"
      >
        Button
      </Button>
      <Button
        color="warn"
        variant="soft"
      >
        Button
      </Button>
      <Button
        color="warn"
        variant="subtle"
      >
        Button
      </Button>
    </div>
    <div class="p-2 flex flex-wrap items-center gap-3">
      <Button color="win">Button</Button>
      <Button
        color="win"
        variant="ghost"
      >
        Button
      </Button>
      <Button
        color="win"
        variant="glass"
      >
        Button
      </Button>
      <Button
        color="win"
        variant="soft"
      >
        Button
      </Button>
      <Button
        color="win"
        variant="subtle"
      >
        Button
      </Button>
    </div>
  </div>
</template>
