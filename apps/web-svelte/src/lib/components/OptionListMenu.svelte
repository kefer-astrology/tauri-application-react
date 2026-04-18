<script lang="ts">
  import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
  import { Button } from '$lib/components/ui/button/index.js';

  export type OptionListMenuItem = {
    value: string;
    label: string;
  };

  let {
    items = [],
    selectedValue = $bindable(''),
  }: {
    items: OptionListMenuItem[];
    selectedValue?: string;
  } = $props();
</script>

<div class="space-y-3">
  <Breadcrumb.Root>
    <Breadcrumb.List class="flex flex-col gap-1.5">
      {#each items as item}
        <Breadcrumb.Item>
          {#if selectedValue === item.value}
            <Breadcrumb.Page class="px-2 py-1.5 text-sm font-semibold underline underline-offset-4 text-panel-foreground">
              {item.label}
            </Breadcrumb.Page>
          {:else}
            <Breadcrumb.Link>
              {#snippet child({ props })}
                <Button
                  type="button"
                  variant="ghost"
                  class={`${props.class ?? ''} px-2 py-1.5 text-sm text-panel-foreground/80 bg-transparent hover:bg-transparent hover:underline transition-colors w-full text-left rounded-md`}
                  onclick={() => selectedValue = item.value}
                >
                  {item.label}
                </Button>
              {/snippet}
            </Breadcrumb.Link>
          {/if}
        </Breadcrumb.Item>
      {/each}
    </Breadcrumb.List>
  </Breadcrumb.Root>
</div>
