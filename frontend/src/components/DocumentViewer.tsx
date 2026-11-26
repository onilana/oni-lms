import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import {
  AlertCircle,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Maximize2,
  Minimize2,
  PlayCircle,
  RefreshCw,
  Search,
  Table
} from 'lucide-react';

interface DocumentViewerProps {
  type: 'video' | 'pdf' | 'doc' | 'word' | 'excel' | 'spreadsheet' | 'link' | 'embed' | 'text';
  url?: string | null;
  title?: string;
  fileName?: string | null;
  content?: string | null;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  type,
  url,
  title = 'Course Material',
  fileName,
  content,
}) => {
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Word Document State
  const [docHtml, setDocHtml] = useState<string | null>(null);

  // Excel Spreadsheet State
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetData, setSheetData] = useState<any[][]>([]);
  const [workbookRef, setWorkbookRef] = useState<XLSX.WorkBook | null>(null);
  const [tableSearch, setTableSearch] = useState('');

  // Fallback iframe for Word / Office documents
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  // Determine effective file extension or format
  const effectiveUrl = url || '';
  const detectedExt = (fileName || effectiveUrl).split('?')[0].split('.').pop()?.toLowerCase() || '';

  const isExcel = type === 'excel' || type === 'spreadsheet' || ['xlsx', 'xls', 'csv'].includes(detectedExt);
  const isWord = type === 'doc' || type === 'word' || ['docx', 'doc'].includes(detectedExt);
  const isPdf = type === 'pdf' || detectedExt === 'pdf';
  const isVideo = type === 'video' || ['mp4', 'webm', 'ogg', 'mov'].includes(detectedExt);
  const isLinkOrEmbed = type === 'link' || type === 'embed';

  // Load and parse Word docx
  useEffect(() => {
    if (!isWord || !effectiveUrl) {
      setDocHtml(null);
      return;
    }

    let isSubscribed = true;
    setLoading(true);
    setError(null);
    setUseIframeFallback(false);

    // If it's docx, try parsing with mammoth
    if (detectedExt === 'docx' || effectiveUrl.endsWith('.docx')) {
      fetch(effectiveUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          return res.arrayBuffer();
        })
        .then((buffer) => mammoth.convertToHtml({ arrayBuffer: buffer }))
        .then((result) => {
          if (isSubscribed) {
            setDocHtml(result.value);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (isSubscribed) {
            console.warn('Direct docx render failed, falling back to viewer iframe', err);
            setUseIframeFallback(true);
            setLoading(false);
          }
        });
    } else {
      // For legacy .doc or web office link, fallback to Office/Google online viewer
      setUseIframeFallback(true);
      setLoading(false);
    }

    return () => {
      isSubscribed = false;
    };
  }, [isWord, effectiveUrl, detectedExt]);

  // Load and parse Excel spreadsheet
  useEffect(() => {
    if (!isExcel || !effectiveUrl) {
      setSheetNames([]);
      setSheetData([]);
      setWorkbookRef(null);
      return;
    }

    let isSubscribed = true;
    setLoading(true);
    setError(null);

    fetch(effectiveUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (!isSubscribed) return;
        const wb = XLSX.read(buffer, { type: 'array' });
        setWorkbookRef(wb);
        setSheetNames(wb.SheetNames);
        if (wb.SheetNames.length > 0) {
          const firstSheet = wb.SheetNames[0];
          setActiveSheet(firstSheet);
          const data: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { header: 1 });
          setSheetData(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (isSubscribed) {
          console.warn('Excel parse error', err);
          setError('Could not load spreadsheet data directly in browser.');
          setUseIframeFallback(true);
          setLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [isExcel, effectiveUrl]);

  // Change active sheet tab
  const handleSelectSheet = (name: string) => {
    if (!workbookRef) return;
    setActiveSheet(name);
    const data: any[][] = XLSX.utils.sheet_to_json(workbookRef.Sheets[name], { header: 1 });
    setSheetData(data);
  };

  // Helper to extract video embed source
  const getVideoSource = (videoInput: string) => {
    const raw = videoInput.trim();

    // Check if input is an iframe tag
    const iframeSrcMatch = raw.match(/<iframe.*?src=["'](.*?)["']/i);
    if (iframeSrcMatch && iframeSrcMatch[1]) {
      return { type: 'iframe', src: iframeSrcMatch[1] };
    }

    // YouTube URLs
    const ytMatch = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return { type: 'iframe', src: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&enablejsapi=1` };
    }

    // Vimeo URLs
    const vimeoMatch = raw.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/i);
    if (vimeoMatch && vimeoMatch[3]) {
      return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeoMatch[3]}` };
    }

    // Direct MP4 / WebM / HTML5 video
    return { type: 'html5', src: raw };
  };

  // Filter spreadsheet rows based on table search
  const filteredRows = sheetData.filter((row, idx) => {
    if (idx === 0) return true; // keep header
    if (!tableSearch) return true;
    return row.some((cell) => String(cell ?? '').toLowerCase().includes(tableSearch.toLowerCase()));
  });

  return (
    <div className={`lms-doc-viewer-wrapper ${fullscreen ? 'is-fullscreen' : ''}`}>
      {/* Top action bar */}
      <div className="viewer-toolbar">
        <div className="viewer-title-group">
          {isVideo && <PlayCircle size={16} className="text-primary" />}
          {isPdf && <FileText size={16} className="text-danger" />}
          {isWord && <FileText size={16} className="text-primary" />}
          {isExcel && <FileSpreadsheet size={16} className="text-success" />}
          {isLinkOrEmbed && <ExternalLink size={16} className="text-info" />}
          <span className="viewer-file-name" title={fileName || title}>
            {fileName || title}
          </span>
          {detectedExt && <span className="viewer-format-pill">{detectedExt.toUpperCase()}</span>}
        </div>

        <div className="viewer-actions">
          {effectiveUrl && (
            <a
              href={effectiveUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              title="Open or Download file"
            >
              <Download size={13} />
              <span>Download</span>
            </a>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setFullscreen(!fullscreen)}
            title={fullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
          >
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{fullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* Main viewer viewport */}
      <div className="viewer-content-viewport">
        {loading && (
          <div className="viewer-loading-state">
            <RefreshCw size={24} className="spin-icon" />
            <p>Loading document directly in LMS...</p>
          </div>
        )}

        {/* 1. VIDEO VIEWER */}
        {isVideo && effectiveUrl && (
          <div className="video-viewport-container">
            {getVideoSource(effectiveUrl).type === 'iframe' ? (
              <iframe
                src={getVideoSource(effectiveUrl).src}
                title={title}
                className="embedded-video-iframe"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <video
                controls
                controlsList="nodownload"
                className="embedded-html5-video"
                src={effectiveUrl}
                key={effectiveUrl}
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        )}

        {/* 2. PDF VIEWER */}
        {isPdf && effectiveUrl && (
          <div className="pdf-viewport-container">
            <iframe
              src={`${effectiveUrl}#toolbar=1&navpanes=0`}
              title={fileName || title}
              className="embedded-pdf-iframe"
            />
          </div>
        )}

        {/* 3. WORD DOCUMENT VIEWER (.docx, .doc) */}
        {isWord && effectiveUrl && (
          <div className="word-viewport-container">
            {docHtml ? (
              <div className="word-paper-page">
                <div
                  className="word-doc-body"
                  dangerouslySetInnerHTML={{ __html: docHtml }}
                />
              </div>
            ) : useIframeFallback ? (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                  effectiveUrl.startsWith('/') ? window.location.origin + effectiveUrl : effectiveUrl
                )}&embedded=true`}
                title={fileName || title}
                className="embedded-office-iframe"
              />
            ) : null}
          </div>
        )}

        {/* 4. EXCEL SPREADSHEET VIEWER (.xlsx, .xls, .csv) */}
        {isExcel && effectiveUrl && (
          <div className="excel-viewport-container">
            {/* Sheet Tabs & Search */}
            <div className="excel-sheet-toolbar">
              <div className="excel-sheet-tabs">
                {sheetNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`sheet-tab-btn ${name === activeSheet ? 'is-active' : ''}`}
                    onClick={() => handleSelectSheet(name)}
                  >
                    <Table size={12} />
                    <span>{name}</span>
                  </button>
                ))}
              </div>

              <div className="excel-search-box">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search spreadsheet data..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Render Tabular Data */}
            {filteredRows.length > 0 ? (
              <div className="excel-table-scrollable">
                <table className="excel-lms-table">
                  <thead>
                    <tr>
                      <th className="row-num-col">#</th>
                      {(filteredRows[0] || []).map((colVal, colIdx) => (
                        <th key={colIdx}>{String(colVal ?? `Col ${colIdx + 1}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.slice(1).map((row, rIdx) => (
                      <tr key={rIdx}>
                        <td className="row-num-cell">{rIdx + 1}</td>
                        {(filteredRows[0] || []).map((_, cIdx) => (
                          <td key={cIdx}>{row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]) : ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : useIframeFallback ? (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                  effectiveUrl.startsWith('/') ? window.location.origin + effectiveUrl : effectiveUrl
                )}&embedded=true`}
                title={fileName || title}
                className="embedded-office-iframe"
              />
            ) : !loading ? (
              <div className="viewer-empty-sheet">
                <AlertCircle size={24} />
                <p>No rows found in this sheet.</p>
              </div>
            ) : null}
          </div>
        )}

        {/* 5. LINK OR EMBED RESOURCE */}
        {isLinkOrEmbed && effectiveUrl && (
          <div className="link-embed-viewport-container">
            {effectiveUrl.startsWith('<iframe') ? (
              <div
                className="raw-embed-wrapper"
                dangerouslySetInnerHTML={{ __html: effectiveUrl }}
              />
            ) : (
              <iframe
                src={effectiveUrl}
                title={title}
                className="embedded-web-iframe"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            )}
            <div className="link-card-footer">
              <div>
                <strong>{title}</strong>
                <p className="text-muted">{effectiveUrl}</p>
              </div>
              <a
                href={effectiveUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary btn-sm"
              >
                <ExternalLink size={14} /> Open in New Window
              </a>
            </div>
          </div>
        )}

        {/* Fallback if no URL provided */}
        {!effectiveUrl && !content && (
          <div className="viewer-empty-placeholder">
            <Eye size={36} />
            <p>No file or stream URL attached to this lesson.</p>
          </div>
        )}
      </div>
    </div>
  );
};
