import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          fontSize: 24,
          background: 'transparent',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Minimal SVG Gear Representation */}
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#DA291C" 
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: '32px', height: '32px' }}
        >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
        </svg>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  );
}
