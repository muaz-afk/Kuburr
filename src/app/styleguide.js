// src/app/styleguide.js
// This file documents the common styles and conventions used in the e-Pusara application.

/**
 * Color Palette
 * -----------------------------------------------------------------------------
 * Defines the main colors used throughout the application.
 * Note: The exact value for 'primary' and 'primary-light' is likely defined
 * in tailwind.config.js.
 */
const colors = {
  // Primary color, used for main actions, headers, and highlights.
  primary: 'bg-primary, text-primary', // Check tailwind.config.js for hex/rgb value
  'primary-light': 'hover:bg-primary-light', // Lighter shade for hover states, check tailwind.config.js

  // Neutral Colors
  white: 'bg-white, text-white', // #ffffff (light mode), #ededed (dark mode via --foreground)
  gray: {
    50: 'bg-gray-50', // Used for main background
    200: 'bg-gray-200', // Used for image placeholders
    700: 'text-gray-700', // Used for body text on light backgrounds
  },

  // Text Colors (explicitly set, others use neutrals or primary)
  // text-white: Used on primary backgrounds
  // text-gray-700: Used for paragraph text on white backgrounds

  // CSS Variables (from globals.css)
  background: 'var(--background)', // #ffffff (light), #0a0a0a (dark)
  foreground: 'var(--foreground)', // #171717 (light), #ededed (dark) - Used for default body text
};

/**
 * Typography
 * -----------------------------------------------------------------------------
 * Defines font families, sizes, and weights.
 */
const typography = {
  // Font Families (from layout.js, loaded as local fonts)
  sans: 'font-geist-sans', // Variable font --font-geist-sans
  mono: 'font-geist-mono', // Variable font --font-geist-mono
  // Default fallback (from globals.css, likely overridden by Geist): Arial, Helvetica, sans-serif

  // Font Smoothing
  antialiasing: 'antialiased', // Applied to <body> in layout.js

  // Font Sizes (Examples from page.js, uses Tailwind scale)
  'text-2xl': 'text-2xl', // e.g., Card titles
  'text-3xl': 'text-3xl', // e.g., Section titles, Secondary hero heading
  'text-4xl': 'text-4xl', // e.g., Main hero heading, responsive sizes used (md:text-5xl)
  'text-5xl': 'md:text-5xl', // Responsive larger heading size

  // Font Weights (Examples from page.js)
  semibold: 'font-semibold', // e.g., Secondary hero heading
  bold: 'font-bold', // e.g., Main hero heading, Section titles, Card titles

  // Prose Styling
  prose: 'prose', // Used in About section for formatted text content (p, ul, li)
};

/**
 * Layout & Spacing
 * -----------------------------------------------------------------------------
 * Defines container sizes, spacing units, and grid layouts.
 */
const layout = {
  // Container
  maxWidth: 'max-w-7xl', // Max width for main content sections
  horizontalCentering: 'mx-auto', // Used with maxWidth to center content

  // Height
  minScreenHeight: 'min-h-screen', // Applied to the main container

  // Padding (Examples from page.js, uses Tailwind scale)
  px4: 'px-4', // Horizontal padding for sections/containers
  py8: 'py-8', // Vertical padding (e.g., Footer)
  py16: 'py-16', // Vertical padding (e.g., Feature/About sections)
  py20: 'py-20', // Vertical padding (e.g., Hero section)
  p6: 'p-6', // Padding within cards

  // Margin (Examples from page.js, uses Tailwind scale)
  mb4: 'mb-4', // Bottom margin (e.g., headings, paragraphs, list items)
  mb8: 'mb-8', // Bottom margin (e.g., section titles)
  pl6: 'pl-6', // Left padding (e.g., lists)

  // Gaps (Used with Flexbox/Grid, uses Tailwind scale)
  gap2: 'gap-2', // Small gap (e.g., button icon and text)
  gap8: 'gap-8', // Larger gap (e.g., grid columns)

  // Display & Grid
  grid: 'grid',
  gridCols2: 'md:grid-cols-2', // Responsive 2-column grid on medium screens+
  flex: 'flex',
  itemsCenter: 'items-center',
  justifyBetween: 'justify-between',
};

/**
 * Components
 * -----------------------------------------------------------------------------
 * Style definitions for common UI components.
 */
const components = {
  // Navigation (Imported as '@/components/Navigation')
  // Style details depend on the Navigation component's implementation.

  // Buttons
  buttonPrimary:
    'bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-light transition-colors flex items-center gap-2',

  // Cards (Example structure from page.js Feature section)
  card: 'bg-white rounded-lg shadow-lg overflow-hidden',
  cardImageContainer: 'h-48 bg-gray-200 relative', // Placeholder styles
  cardImage: 'w-full h-full object-cover',
  cardContent: 'p-6',
  cardTitle: 'text-2xl font-bold text-primary mb-4',

  // Forms (Example from carian/page.js)
  input:
    'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-black',
  // Note: text-black is explicitly used to ensure input text is always black, regardless of dark/light mode.
  label: 'block text-sm font-medium text-gray-700 mb-1',

  // Sections (Common structure)
  section: 'py-16 px-4', // Base padding, background varies (bg-gray-50, bg-white)
  sectionContainer: 'max-w-7xl mx-auto',

  // Footer
  footer: 'bg-primary text-white py-8',
  footerContainer: 'max-w-7xl mx-auto px-4 flex justify-between items-center',
};

/**
 * Icons
 * -----------------------------------------------------------------------------
 * Icon library and usage.
 */
const icons = {
  library: 'FontAwesome (@fortawesome/react-fontawesome)',
  usage: '<FontAwesomeIcon icon={iconName} />',
  examples: {
    search: 'faSearch from @fortawesome/free-solid-svg-icons',
    calendar: 'faCalendar from @fortawesome/free-solid-svg-icons',
    whatsapp: 'faWhatsapp from @fortawesome/free-brands-svg-icons',
  },
};

// Note: This file is for documentation purposes.
// It does not export any values for direct use in the application code by default,
// but could be adapted to export theme constants if desired. 