type SharedSvgIconProps = {
	src: string;
	className?: string;
	size?: number;
	width?: number;
	height?: number;
	maskScale?: number;
	title?: string;
};

export function SharedSvgIcon({
	src,
	className = '',
	size = 20,
	width,
	height,
	maskScale = 1,
	title
}: SharedSvgIconProps) {
	const resolvedWidth = width ?? size;
	const resolvedHeight = height ?? size;
	const resolvedMaskScale = `${maskScale * 100}%`;

	return (
		<span
			className={className}
			title={title}
			aria-hidden={title ? undefined : true}
			role={title ? 'img' : 'presentation'}
			style={{
				width: resolvedWidth,
				height: resolvedHeight,
				display: 'block',
				flexShrink: 0,
				lineHeight: 0,
				verticalAlign: 'middle',
				backgroundColor: 'currentColor',
				maskImage: `url(${src})`,
				maskRepeat: 'no-repeat',
				maskPosition: 'center',
				maskSize: `${resolvedMaskScale} ${resolvedMaskScale}`,
				WebkitMaskImage: `url(${src})`,
				WebkitMaskRepeat: 'no-repeat',
				WebkitMaskPosition: 'center',
				WebkitMaskSize: `${resolvedMaskScale} ${resolvedMaskScale}`
			}}
		/>
	);
}
