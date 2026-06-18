interface Props {
  name: string
  isDir: boolean
}

function FileIcon({ name, isDir }: Props) {
  const ext = name.split('.').pop()?.toLowerCase()

  if (isDir) {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M4 9a2 2 0 012-2h8l2 2h10a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V9z" fill="#5AC8FA" />
        <path d="M4 11a2 2 0 012-2h20a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V11z" fill="#81D8FE" />
        <path d="M4 11a2 2 0 012-2h20a2 2 0 012 2v1H4v-1z" fill="#5AC8FA" opacity="0.3" />
      </svg>
    )
  }

  const badge = (() => {
    switch (ext) {
      case 'pdf':
        return (
          <>
            <rect x="2" y="5" width="28" height="28" rx="4" fill="#FF3B30" />
            <text x="8" y="22" fontSize="8" fill="#fff" fontWeight="900" fontFamily="system-ui" letterSpacing="0.5">PDF</text>
          </>
        )
      case 'md':
      case 'mkd':
      case 'markdown':
        return (
          <>
            <rect x="2" y="5" width="28" height="28" rx="3" fill="#fff" stroke="#D1D1D6" strokeWidth="0.5" />
            <rect x="2" y="11" width="28" height="4" rx="1" fill="#5856D6" />
            <text x="7" y="14.5" fontSize="5" fill="#fff" fontWeight="800" fontFamily="system-ui">MD</text>
            <line x1="8" y1="20" x2="18" y2="20" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="23" x2="24" y2="23" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="26" x2="20" y2="26" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round" />
          </>
        )
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'svg':
        return (
          <>
            <rect x="2" y="5" width="28" height="28" rx="3" fill="#fff" stroke="#D1D1D6" strokeWidth="0.5" />
            <rect x="2" y="11" width="28" height="4" rx="1" fill="#007AFF" />
            <text x="6" y="14.5" fontSize="5" fill="#fff" fontWeight="800" fontFamily="system-ui">IMG</text>
            <circle cx="12" cy="20" r="2.5" fill="#007AFF" opacity="0.5" />
            <path d="M4 28l5-6 4 4 7-8 8 10H4z" fill="#007AFF" opacity="0.3" />
          </>
        )
      case 'doc':
      case 'docx':
        return (
          <>
            <rect x="2" y="5" width="28" height="28" rx="3" fill="#fff" stroke="#D1D1D6" strokeWidth="0.5" />
            <rect x="2" y="11" width="28" height="4" rx="1" fill="#007AFF" />
            <text x="6" y="14.5" fontSize="5" fill="#fff" fontWeight="800" fontFamily="system-ui">DOC</text>
            <line x1="8" y1="20" x2="24" y2="20" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="23" x2="26" y2="23" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="26" x2="22" y2="26" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round" />
          </>
        )
      case 'xls':
      case 'xlsx':
        return (
          <>
            <rect x="2" y="5" width="28" height="28" rx="3" fill="#fff" stroke="#D1D1D6" strokeWidth="0.5" />
            <rect x="2" y="11" width="28" height="4" rx="1" fill="#34C759" />
            <text x="6" y="14.5" fontSize="5" fill="#fff" fontWeight="800" fontFamily="system-ui">XLS</text>
            <line x1="8" y1="20" x2="24" y2="20" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="23" x2="26" y2="23" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="26" x2="22" y2="26" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round" />
          </>
        )
      case 'ppt':
      case 'pptx':
        return (
          <>
            <rect x="2" y="5" width="28" height="28" rx="3" fill="#fff" stroke="#D1D1D6" strokeWidth="0.5" />
            <rect x="2" y="11" width="28" height="4" rx="1" fill="#FF9500" />
            <text x="5" y="14.5" fontSize="5" fill="#fff" fontWeight="800" fontFamily="system-ui">PPT</text>
            <circle cx="16" cy="24" r="5" fill="#FF9500" opacity="0.3" />
            <polygon points="16,20 16,28 22,24" fill="#FF9500" />
          </>
        )
      case 'zip':
      case 'tar':
      case 'gz':
        return (
          <>
            <rect x="2" y="5" width="28" height="28" rx="3" fill="#fff" stroke="#D1D1D6" strokeWidth="0.5" />
            <rect x="2" y="11" width="28" height="4" rx="1" fill="#FF9500" />
            <text x="6" y="14.5" fontSize="5" fill="#fff" fontWeight="800" fontFamily="system-ui">ZIP</text>
            <rect x="9" y="19" width="14" height="10" rx="1.5" fill="none" stroke="#C7C7CC" strokeWidth="1.5" />
            <line x1="12" y1="22" x2="20" y2="22" stroke="#C7C7CC" strokeWidth="1" />
            <line x1="12" y1="25" x2="20" y2="25" stroke="#C7C7CC" strokeWidth="1" />
          </>
        )
      case 'mp4':
      case 'mov':
      case 'avi':
      case 'mkv':
        return (
          <>
            <rect x="2" y="5" width="28" height="28" rx="3" fill="#fff" stroke="#D1D1D6" strokeWidth="0.5" />
            <rect x="2" y="11" width="28" height="4" rx="1" fill="#FF2D55" />
            <text x="6" y="14.5" fontSize="5" fill="#fff" fontWeight="800" fontFamily="system-ui">VID</text>
            <rect x="8" y="19" width="16" height="10" rx="1.5" fill="#FF2D55" opacity="0.15" />
            <polygon points="12,20 12,28 22,24" fill="#FF2D55" />
          </>
        )
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'aac':
        return (
          <>
            <rect x="2" y="5" width="28" height="28" rx="3" fill="#fff" stroke="#D1D1D6" strokeWidth="0.5" />
            <rect x="2" y="11" width="28" height="4" rx="1" fill="#FF2D55" />
            <text x="6" y="14.5" fontSize="5" fill="#fff" fontWeight="800" fontFamily="system-ui">AUD</text>
            <path d="M16 20v6M13 22v2M19 22v2M10 23v0M22 23v0" stroke="#FF2D55" strokeWidth="1.5" strokeLinecap="round" />
          </>
        )
      case 'txt':
      case 'rtf':
        return (
          <>
            <rect x="2" y="5" width="28" height="28" rx="3" fill="#fff" stroke="#D1D1D6" strokeWidth="0.5" />
            <rect x="2" y="11" width="28" height="4" rx="1" fill="#8E8E93" />
            <text x="6" y="14.5" fontSize="5" fill="#fff" fontWeight="800" fontFamily="system-ui">TXT</text>
            <line x1="8" y1="20" x2="24" y2="20" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="23" x2="26" y2="23" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="26" x2="22" y2="26" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round" />
          </>
        )
      default:
        return (
          <>
            <rect x="2" y="5" width="28" height="28" rx="3" fill="#fff" stroke="#D1D1D6" strokeWidth="0.5" />
            <rect x="2" y="11" width="28" height="4" rx="1" fill="#8E8E93" />
            <line x1="8" y1="20" x2="24" y2="20" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="23" x2="26" y2="23" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="26" x2="22" y2="26" stroke="#C7C7CC" strokeWidth="1.5" strokeLinecap="round" />
          </>
        )
    }
  })()

  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      {badge}
    </svg>
  )
}

export default FileIcon
