// Dashboard navigation shell with a logout action shared across protected views.
export default function Sidebar({ onLogout }) {
  return (
    <aside className="flex w-full shrink-0 flex-col bg-blue-950 text-blue-50 md:w-64">
      <div className="border-b border-blue-800 px-6 py-6"><p className="text-lg font-bold">GovDocs AI</p><p className="mt-1 text-xs text-blue-200">Government Documentation</p></div>
      <nav className="flex flex-1 gap-1 px-3 py-5 md:block">
        {["Dashboard", "Documents", "Profile"].map((item) => <button className={`rounded-lg px-4 py-3 text-left text-sm font-medium ${item === "Dashboard" ? "bg-blue-700 text-white" : "text-blue-100 hover:bg-blue-900"}`} key={item}>{item}</button>)}
      </nav>
      <button className="m-3 rounded-lg border border-blue-700 px-4 py-3 text-left text-sm font-medium hover:bg-blue-900" onClick={onLogout}>Logout</button>
    </aside>
  );
}
