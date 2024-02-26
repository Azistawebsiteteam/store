class APIFeatures {
  constructor(query, queryStr) {
    this.query = query;
    this.queryStr = queryStr;
  }

  filter() {
    const queryObj = { ...this.queryStr };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    let queryStr = Object.entries(queryObj)
      .map(([key, value]) => `\`${key}\` = '${value}'`)
      .join(' AND ');

    this.query = this.query.where(queryStr);

    return this;
  }

  sort() {
    if (this.queryStr.sort) {
      const sortBy = this.queryStr.sort
        .split(',')
        .map((field) => `\`${field.trim()}\``)
        .join(', ');
      this.query = this.query.orderBy(sortBy);
    } else {
      this.query = this.query.orderBy('createdAt', 'desc');
    }

    return this;
  }

  limitsFields() {
    if (this.queryStr.fields) {
      const fields = this.queryStr.fields
        .split(',')
        .map((field) => `\`${field.trim()}\``)
        .join(', ');
      this.query = this.query.select(fields);
    } else {
      // If no fields specified, select all
      this.query = this.query.select('*');
    }

    return this;
  }

  paginate() {
    const page = this.queryStr.page || 1;
    const limit = this.queryStr.limit || 10;
    const offset = (page - 1) * limit;

    this.query = this.query.limit(limit).offset(offset);

    return this;
  }
}

module.exports = APIFeatures;
