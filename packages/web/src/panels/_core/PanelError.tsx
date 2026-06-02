export function PanelError({ message }: { message: string }) {
  return <div className="text-xs text-red-500 p-2">{message}</div>;
}
