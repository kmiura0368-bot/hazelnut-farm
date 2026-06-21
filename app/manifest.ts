import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '向野ヘーゼルナッツ農園 管理システム',
    short_name: '農園台帳',
    description: 'ヘーゼルナッツ農園の樹木カルテ・生育記録・会計',
    start_url: '/',
    display: 'standalone',
    background_color: '#14532d',
    theme_color: '#14532d',
    icons: [
      {
        src: '/iwaki.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any',
      },
    ],
  };
}
