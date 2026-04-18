<script lang="ts">
  let {
    src,
    class: className = '',
    size = 20,
    width,
    height,
    maskScale = 1,
    title
  }: {
    src: string;
    class?: string;
    size?: number;
    width?: number;
    height?: number;
    maskScale?: number;
    title?: string;
  } = $props();

  const resolvedWidth = $derived(width ?? size);
  const resolvedHeight = $derived(height ?? size);
  const resolvedMaskScale = $derived(`${maskScale * 100}%`);
</script>

<span
  class={className}
  role={title ? 'img' : 'presentation'}
  aria-label={title}
  aria-hidden={title ? undefined : true}
  title={title}
  style={`width:${resolvedWidth}px;height:${resolvedHeight}px;display:inline-block;background-color:currentColor;mask-image:url(${src});mask-repeat:no-repeat;mask-position:center;mask-size:${resolvedMaskScale} ${resolvedMaskScale};-webkit-mask-image:url(${src});-webkit-mask-repeat:no-repeat;-webkit-mask-position:center;-webkit-mask-size:${resolvedMaskScale} ${resolvedMaskScale};`}
></span>
