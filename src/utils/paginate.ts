type PrismaModel = {
  findMany: (args?: any) => Promise<any[]>;
  count: (args?: any) => Promise<number>;
}

async function paginate(model: PrismaModel, { page = 1, limit = 15, where = {}, orderBy = {}, include = {} }) {
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    model.findMany({ skip, take: limit, where, orderBy, include }),
    model.count({ where }),
  ])

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  }
}

export default paginate;
