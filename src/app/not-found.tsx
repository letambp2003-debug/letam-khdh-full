import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="card max-w-md w-full p-8 space-y-4">
        <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
          404
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Trang không tồn tại</h1>
        <p className="text-slate-600 text-sm">
          Đường dẫn bạn yêu cầu không khả dụng hoặc đã được di chuyển.
        </p>
        <Link href="/" className="btn-primary inline-block w-full text-center mt-4">
          Về Trang Chủ
        </Link>
      </div>
    </div>
  );
}
