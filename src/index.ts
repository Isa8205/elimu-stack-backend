import express, { Request, Response } from 'express';
import cors from 'cors';
import { logger } from './middleware/logger';
import prisma from './lib/prisma';
import { Prisma } from './generated/client';

require('dotenv').config();

const app = express();

app.use(logger);
app.use(cors());
app.use(express.json());

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

app.get("/get-semesters", async (req, res) => {
  const { courseId } = req.query; 

  const results = await prisma.semester.findMany({
    where: {
      course: {
        id: String(courseId),
      }
    }
  });

  res.status(200).json(results);
})

app.get("/get-courses", async (req, res) => {
  const results = await prisma.course.findMany();

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

app.get("/papers", async (req, res) => {
  const result = {
    status: "success",
    data: [
      { id: 1,
        name: "English made farmilliar"
      }
    ]
  }

  res.send(result);
})

// Central error handling
app.use((err: Error, req: Request, res: Response) => {
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
