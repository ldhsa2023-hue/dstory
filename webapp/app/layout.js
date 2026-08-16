import './globals.css';
import NavBar from '../components/NavBar';

export const metadata = {
  title: 'dstory — AI 유튜브 콘텐츠 기획 도구',
  description: '트렌드 조사 → GPT 씬 프롬프트 → Higgsfield 프롬프트 생성까지 한 흐름으로 이어주는 로컬 도구',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <NavBar />
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
