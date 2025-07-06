import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))'
				},
				camera: {
					DEFAULT: 'hsl(var(--camera))',
					foreground: 'hsl(var(--camera-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				info: {
					DEFAULT: 'hsl(var(--info))',
					foreground: 'hsl(var(--info-foreground))'
				},
				// Heritage Color Palette
				'dark-blue': {
					50: 'hsl(226 42% 23%)',
					100: 'hsl(225 42% 20%)',
					200: 'hsl(224 56% 25%)',
					300: 'hsl(224 53% 27%)',
					400: 'hsl(224 51% 29%)',
					500: 'hsl(222 62% 15%)', // main color
					600: 'hsl(223 81% 11%)',
					700: 'hsl(225 42% 20%)',
					800: 'hsl(224 42% 23%)',
					900: 'hsl(223 81% 11%)'
				},
				'heritage-brown': {
					50: 'hsl(25 47% 56%)',
					100: 'hsl(23 49% 46%)',
					200: 'hsl(22 49% 35%)',
					300: 'hsl(21 50% 24%)',
					400: 'hsl(21 50% 13%)',
					500: 'hsl(25 47% 56%)',
					600: 'hsl(23 49% 46%)',
					700: 'hsl(22 49% 35%)',
					800: 'hsl(21 50% 24%)',
					900: 'hsl(21 50% 13%)'
				},
				'heritage-sand': {
					50: 'hsl(28 100% 96%)',
					100: 'hsl(32 88% 89%)',
					200: 'hsl(36 82% 82%)',
					300: 'hsl(34 62% 74%)',
					400: 'hsl(32 54% 65%)',
					500: 'hsl(32 88% 89%)',
					600: 'hsl(34 62% 74%)',
					700: 'hsl(32 54% 65%)',
					800: 'hsl(34 62% 74%)',
					900: 'hsl(32 54% 65%)'
				},
				'heritage-gold': {
					50: 'hsl(50 80% 75%)',
					100: 'hsl(43 48% 51%)',
					200: 'hsl(42 48% 46%)',
					300: 'hsl(43 48% 51%)',
					400: 'hsl(42 48% 46%)',
					500: 'hsl(50 80% 75%)',
					600: 'hsl(43 48% 51%)',
					700: 'hsl(42 48% 46%)',
					800: 'hsl(43 48% 51%)',
					900: 'hsl(42 48% 46%)'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
