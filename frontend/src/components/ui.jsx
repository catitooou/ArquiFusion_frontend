import { cx } from '../lib/format.js';

export function StatCard({ label, value, hint, color, onClick, active }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={cx(
        'flex min-w-0 flex-col rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition',
        onClick && 'hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900',
        active ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200',
      )}
    >
      <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
        {color && <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />}
        {label}
      </span>
      <span className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</span>
      {hint && <span className="truncate text-xs text-slate-500">{hint}</span>}
    </Tag>
  );
}

export function Card({ title, actions, children, className, bodyClassName }) {
  return (
    <section className={cx('flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
          {title && <h2 className="text-sm font-semibold text-slate-800">{title}</h2>}
          {actions}
        </header>
      )}
      <div className={cx('min-h-0 flex-1', bodyClassName ?? 'p-4')}>{children}</div>
    </section>
  );
}

export function Loading({ label = 'Cargando…' }) {
  return (
    <div className="flex items-center justify-center gap-2 p-6 text-sm text-slate-500" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
      <p className="font-medium">No se pudo cargar la información.</p>
      <p className="mt-1 text-red-700">{error?.message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 rounded-md bg-red-700 px-3 py-1 text-white hover:bg-red-800">
          Reintentar
        </button>
      )}
    </div>
  );
}

export function Empty({ children }) {
  return <p className="p-6 text-center text-sm text-slate-500">{children}</p>;
}

export function Button({ variant = 'primary', className, ...props }) {
  const v = {
    primary: 'bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-400',
    secondary: 'bg-white text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
    success: 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
    ghost: 'text-slate-700 hover:bg-slate-100',
  }[variant];
  return (
    <button
      type="button"
      className={cx('inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed', v, className)}
      {...props}
    />
  );
}
