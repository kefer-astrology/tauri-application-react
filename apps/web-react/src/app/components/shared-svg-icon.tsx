import React from 'react';

type SharedSvgIconProps = {
	src: string;
	className?: string;
	size?: number;
	title?: string;
};

export function SharedSvgIcon({
	src,
	className = '',
	size = 20,
	title
}: SharedSvgIconProps) {
	return (
		<span
			className={className}
			title={title}
			aria-hidden={title ? undefined : true}
			role={title ? 'img' : 'presentation'}
			style={{
				width: size,
				height: size,
				display: 'block',
				flexShrink: 0,
				lineHeight: 0,
				verticalAlign: 'middle',
				backgroundColor: 'currentColor',
				maskImage: `url(${src})`,
				maskRepeat: 'no-repeat',
				maskPosition: 'center',
				maskSize: 'contain',
				WebkitMaskImage: `url(${src})`,
				WebkitMaskRepeat: 'no-repeat',
				WebkitMaskPosition: 'center',
				WebkitMaskSize: 'contain'
			}}
		/>
	);
}
