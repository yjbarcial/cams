// Paginate results
export const paginate = (data, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const paginatedData = data.slice(offset, offset + limit);
  
  return {
    data: paginatedData,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: data.length,
      totalPages: Math.ceil(data.length / limit),
      hasNext: offset + limit < data.length,
      hasPrev: page > 1
    }
  };
};

// Build SQL pagination
export const buildPaginationSQL = (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  return {
    limit: parseInt(limit),
    offset: parseInt(offset),
    sql: `LIMIT ${limit} OFFSET ${offset}`
  };
};

// Build search query
export const buildSearchQuery = (fields, searchTerm) => {
  if (!searchTerm || !fields.length) return '';
  
  const conditions = fields.map(field => `${field} ILIKE $`).join(' OR ');
  return `(${conditions})`;
};

// Build filter query
export const buildFilterQuery = (filters) => {
  const conditions = [];
  const params = [];
  let paramCount = 1;

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      conditions.push(`${key} = $${paramCount}`);
      params.push(value);
      paramCount++;
    }
  });

  return {
    conditions: conditions.join(' AND '),
    params,
    paramCount
  };
};

// Sort data
export const sortData = (data, sortBy, order = 'asc') => {
  return [...data].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    
    if (aVal === bVal) return 0;
    
    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
};

// Filter data by multiple criteria
export const filterData = (data, filters) => {
  return data.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      if (value === undefined || value === null || value === '') return true;
      
      if (Array.isArray(value)) {
        return value.includes(item[key]);
      }
      
      if (typeof value === 'string' && value.includes('%')) {
        const regex = new RegExp(value.replace(/%/g, '.*'), 'i');
        return regex.test(item[key]);
      }
      
      return item[key] === value;
    });
  });
};

export default {
  paginate,
  buildPaginationSQL,
  buildSearchQuery,
  buildFilterQuery,
  sortData,
  filterData
};
