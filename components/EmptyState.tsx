interface EmptyStateProps {
  title: string;
  message: string;
  actions: Array<{ label: string; onClick: () => void }>;
}

export default function EmptyState({ title, message, actions }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center max-w-md px-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{title}</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex gap-4 justify-center flex-wrap">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

