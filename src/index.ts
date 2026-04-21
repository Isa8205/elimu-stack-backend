import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { logger } from './middleware/logger';
import prisma from './lib/prisma';
import { Paper_Category, Prisma } from '../prisma/generated/client';
import multer from "multer";
import fs from "fs";
import path from 'path';
import mime from "mime-types"
import { getFileUrl } from './utils/url';

const app = express();

// File uploads for dev
let uploadDir: string;
if (process.env.NODE_ENV !== "production") {
  uploadDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

app.use(logger);
app.use(cors());
app.use(express.json());

app.get("/media", async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Id not provided" });
  }

  const paper = await prisma.paper.findUnique({
    where: {
      id: String(id)
    }
  });

  if (!paper) return res.status(404).json({ error: "File not found" });

  const absolutePath = path.resolve(paper.fileUrl);

  const uploadsDir = path.resolve(__dirname, "../uploads/papers");
  if (!absolutePath.startsWith(uploadsDir)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (!fs.existsSync(absolutePath)) {
    return res.status(410).json({ error: "File no longer exists on disk" });
  }

  const mimeType = mime.lookup(absolutePath) || 'application/octet-stream';
  const safeName = paper.title.replace(/[^a-z0-9]/gi, '_');

  console.log(safeName);

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${safeName}.pdf"`);

  fs.createReadStream(absolutePath).pipe(res);
});

app.get("/health", (_req, res) => {
  res.sendStatus(200);
});

app.post("/add-course", async (req, res, next) => {
  try {
    const data: { name: string, academicYears: number } = req.body;

    if (!data.name || !data.academicYears) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const course = await prisma.course.create({
      data: {
        name: data.name
      },
    })

    const yearsArray = Array.from({ length: data.academicYears }, (_, i) => i+1);
    yearsArray.forEach(async (currYear) => {
      await prisma.semester.create({
        data: {
          name: `${currYear}.1`,
          academicYear: currYear,
          course: {
            connect: { id: course.id }
          }
        }
      });

      await prisma.semester.create({
        data: {
          name: `${currYear}.2`,
          academicYear: currYear,
          course: {
            connect: { id: course.id }
          }
        }
      });
    });

    res.status(201).json({ message: "Course created successfully" });
  } catch (err) {
    next(err);
  }
});

app.get("/get-nav-sems", async (req, res) => {
  const { course, year } = req.query;

  if (!course || !year) {
    return res.status(400).json({ error: "Missing course and year in the request" });
  }

  const queryData = await prisma.semester.findMany({
    select: {
      id: true,
      name: true,
      units: {
        select: {
          id: true,
          name: true
        }
      }
    },
    where: {
      academicYear: parseInt(String(year)),
      course: {
        name: String(course),
      }
    }
  })

  const results = queryData.map(item => {
    return { ...item, name: `Semester ${parseInt(item.name.split(".")[1])}` };
  })

  res.status(200).json({ result: results });
});

app.get("/get-semesters", async (req, res) => {
  const { courseId, year } = req.query; 

  const results = await prisma.semester.findMany({
    where: {
      course: {
        id: String(courseId),
      },
      ...(year && { academicYear: Number(year) })
    }
  });

  res.status(200).json({ semesters: results });
})

app.get("/get-courses", async (req, res) => {
  const courses = await prisma.course.findMany({
    include: {
      semesters: {
        orderBy: { "academicYear": "asc" }
      }
    }
  });

  const results = courses.map((course) => {
    return {
      ...course,
      academicYears: Math.max(...course.semesters.map(s => s.academicYear))
    }
  });

  res.status(200).json({ courses: results });
});

app.post("/add-unit", async (req, res, next) => {
  try {
    const data: { name: string, code: string, semesterId: string } = req.body;

    if (!data.name || !data.code || !data.semesterId) {
      res.status(400).json({ error: "Missing required fields" });
    }

    await prisma.unit.create({
      data: {
        name: data.name,
        code: data.code,
        semester: {
          connect: { id: data.semesterId }
        }
      }
    });

    res.status(201).json({ message: "Unit created successfully" });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

app.get("/get-units", async (req, res, next) => {
 try {
   const { semesterId } = req.query;

   if (semesterId) {
     const results = await prisma.unit.findMany({
       where: {
         semester: {
           id: String(semesterId)
         }
       }
     })

     return res.status(200).json({ units: results });
   }

   res.status(400).json({ error: "Missing semesterId in query" });
 } catch (err) {
   next(err);
 }
});

app.post("/add-paper", upload.single("file"), async (req, res, next) => {
  const { title, unitId } = req.body;
  const file = req.file;
  
  if (!title || !unitId || !file) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (file.mimetype !== "application/pdf") {
    return res.status(422).json({ error: "Wrong file type. Only pdf accepted" });
  }

  const papersDir = path.join(uploadDir, "papers");
  if (!fs.existsSync(papersDir)) {
    await fs.promises.mkdir(papersDir, { recursive: true });
  }

  // TODO: Handle how multer throws errors regarding file size.
  const filePath = path.join(papersDir, `${Date.now()}-${file.originalname}`);

  try {
    await fs.promises.writeFile(filePath, file.buffer);

    await prisma.paper.create({
      data: {
        title: title,
        fileUrl: filePath,
        category: Paper_Category.FINAL_EXAM,
        examYear: 2025,
        unit: { connect: { id: unitId } }
      }
    })

    res.status(201).json({ message: "Paper saved successfully" });
  } catch(err) {
    console.error(err);

    await fs.promises.unlink(filePath);
    next(err);
  }
});

app.get("/get-papers", async (req, res, next) => {
  const { page, limit, course, year, semester, unit } = req.query;

  const currentPage = page || 1;
  const itemsPerPage = limit || 15;

  try {
    const papers = await prisma.paper.findMany({
      where: {
        unit: {
          semester: {
            academicYear: Number(year),
            course: {
              name: String(course),
            },
          }
        }
      },
      include: {
        unit: {
          select: {
            name: true,
            semester: {
              select: {
                name: true
              }
            } 
          }
        }
      },
      omit: {
        unitId: true,
      }
    });

    const result = papers.map((paper) => {
      const semString = paper.unit.semester.name;

      const currentSem = parseInt(semString.split('.')[1]);

      let finalPaper = { ...paper, unit: { ...paper.unit, semester: currentSem } };

      if (paper.fileUrl) {
        finalPaper = { ...finalPaper, fileUrl: `${getFileUrl(req, paper.id)}` };
      }

      return finalPaper;
    });

    res.status(200).json({ papers: result, totalPages: 5 });
  } catch (err) {
    next(err);
  }
})

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Central error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large. Max size is 5MB.',
      });
    }
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const field = err.meta?.target;
      return res.status(409).json({
        error: `${field} is already taken`
      });
    }

    if (err.code === "P2025") {
      return res.status(404).json({ error: "Record not found" });
    }
  }

  // Fallback
  res.status(500).json({ error: "Internal server error" });
})

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
