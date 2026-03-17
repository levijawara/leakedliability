export function WageShieldPreview() {
  return (
    <div className="w-full border border-green-500/40 p-6 bg-black rounded-xl shadow-lg shadow-green-500/10">
      <div className="flex items-center justify-between mb-4">
        <span className="text-green-500 text-xs tracking-[0.25em]">
          WAGE SHIELD
        </span>
        <span className="text-[11px] text-gray-400 uppercase tracking-wide">
          Active protection
        </span>
      </div>

      <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-4">
        We don’t just track producers.
        <br />
        <span className="text-green-500">We deal with them.</span>
      </h2>

      <div className="space-y-2.5 text-sm text-gray-300">
        <p>• Background checks before you step on set</p>
        <p>• Outreach within 48 hours if payment stalls</p>
        <p>• Escrow + legal escalation if needed</p>
      </div>

      <div className="mt-5 border-t border-white/10 pt-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm gap-2">
        <span className="text-gray-400">You stay anonymous.</span>
        <span className="text-green-500">They stay accountable.</span>
      </div>
    </div>
  );
}

