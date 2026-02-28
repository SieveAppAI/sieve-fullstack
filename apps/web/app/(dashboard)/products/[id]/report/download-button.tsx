export function DownloadReportButton({ productId }: { productId: string }) {
  return (
    <a
      href={`/api/v1/reports/${productId}/pdf`}
      download
      className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
    >
      Download PDF
    </a>
  );
}
