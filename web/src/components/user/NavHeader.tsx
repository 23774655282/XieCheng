/**
 * 用户端 - 详情页顶部导航（标题 + 返回）
 */
import { Link } from 'react-router-dom';

interface NavHeaderProps {
  title: string;
  backTo: string;
}

export default function NavHeader({ title, backTo }: NavHeaderProps) {
  return (
    <header className="nav-header" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem', borderBottom: '1px solid #eee' }}>
      <Link to={backTo} style={{ textDecoration: 'none', color: '#1677ff' }}>← 返回</Link>
      <h1 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h1>
    </header>
  );
}
