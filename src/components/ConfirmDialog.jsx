export default function ConfirmDialog({ title="Are you sure?", message, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold">{title}</h2>
        {message && <p className="text-sm text-gray-600 mt-2">{message}</p>}
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCancel} className="px-3 py-1 rounded border">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-1 rounded bg-red-600 text-white">Delete</button>
        </div>
      </div>
    </div>
  );
}
