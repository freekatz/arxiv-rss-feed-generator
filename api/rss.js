/**
 * arXiv RSS Proxy API for Vercel
 *
 * Usage (same as arXiv API, plus date parameter):
 *   /api/rss?search_query=cat:cs.LG&date=yesterday&max_results=50
 *
 * Parameters (matching arXiv API):
 *   - search_query: search query (without date filter)
 *   - sortBy: submittedDate | lastUpdatedDate | relevance (default: submittedDate)
 *   - sortOrder: descending | ascending (default: descending)
 *   - start: start index (default: 0)
 *   - max_results: max results (default: 50)
 *
 * Additional parameter:
 *   - date: yesterday | today | week | month | none | YYYYMMDD-YYYYMMDD
 */

export default async function handler(req, res) {
  // Get parameters (matching arXiv API naming)
  const query = req.query.search_query || '';
  const dateParam = req.query.date || 'none';
  const sortBy = req.query.sortBy || 'submittedDate';
  const sortOrder = req.query.sortOrder || 'descending';
  const maxResults = req.query.max_results || '50';
  const start = req.query.start || '0';

  // Calculate date range
  const dateQuery = getDateQuery(dateParam);

  // Build final search query
  let searchQuery = query;
  if (dateQuery) {
    if (searchQuery) {
      searchQuery = `${searchQuery} AND ${dateQuery}`;
    } else {
      searchQuery = dateQuery;
    }
  }

  // Build arXiv API URL
  const arxivUrl = new URL('https://export.arxiv.org/api/query');
  if (searchQuery) {
    arxivUrl.searchParams.set('search_query', searchQuery);
  }
  arxivUrl.searchParams.set('sortBy', sortBy);
  arxivUrl.searchParams.set('sortOrder', sortOrder);
  arxivUrl.searchParams.set('start', start);
  arxivUrl.searchParams.set('max_results', maxResults);

  try {
    // Fetch from arXiv
    const response = await fetch(arxivUrl.toString());
    const body = await response.text();

    // Return with appropriate headers
    res.setHeader('Content-Type', 'application/atom+xml; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(body);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from arXiv' });
  }
}

function getDateQuery(dateParam) {
  const today = new Date();
  let fromDate, toDate;

  switch (dateParam) {
    case 'today':
      fromDate = toDate = new Date(today);
      break;
    case 'yesterday':
      fromDate = toDate = new Date(today);
      fromDate.setDate(today.getDate() - 1);
      break;
    case 'week':
      fromDate = new Date(today);
      fromDate.setDate(today.getDate() - 7);
      toDate = new Date(today);
      break;
    case 'month':
      fromDate = new Date(today);
      fromDate.setDate(today.getDate() - 30);
      toDate = new Date(today);
      break;
    case 'all':
    case 'none':
    case '':
      return null;
    default:
      // Try to parse custom range: YYYYMMDD-YYYYMMDD
      if (dateParam.includes('-') && dateParam.length === 17) {
        const parts = dateParam.split('-');
        fromDate = parseDate(parts[0]);
        toDate = parseDate(parts[1]);
        if (!fromDate || !toDate) return null;
      } else {
        return null;
      }
  }

  return `submittedDate:[${formatDate(fromDate)} TO ${formatDate(toDate)}]`;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function parseDate(str) {
  if (str.length !== 8) return null;
  const year = parseInt(str.substring(0, 4));
  const month = parseInt(str.substring(4, 6)) - 1;
  const day = parseInt(str.substring(6, 8));
  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return null;
  return date;
}
