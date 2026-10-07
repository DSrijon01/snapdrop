import { ImageResponse } from 'next/og';

// Route segment config
export const dynamic = 'force-static';

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
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#E3182D',
          borderRadius: '7px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          fontWeight: 900,
          fontStyle: 'italic',
          fontSize: '18px',
          letterSpacing: '-1px',
          textShadow: '2px 2px 0px #FACC15, 3px 3px 0px #000000',
        }}
      >
        SS
      </div>
    ),
    {
      ...size,
    }
  );
}
