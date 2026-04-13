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
    const data: { name: string } = req.body;

    if (!data.name) {
      res.status(400).json({ message: "Missing name field" });
      return;
    }

    await prisma.course.create({
      data: {
        name: data.name
      },
    })

    res.status(200).json({ message: "Course created successfully" });
  } catch (err) {
    next(err);
  }
})

app.post("/add-semester", async (req, res) => {
  const data: { courseId: string, name: string, academicYear: number } = req.body;

  if (!data.courseId || !data.name || !data.academicYear) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  const course = await prisma.course.findFirst({
    where: {
      id: data.courseId
    }
  });

  if (!course) {
    return res.status(404).json({ error: "The specified course does not exist." });
  }

  await prisma.semester.create({
    data: {
      name: data.name,
      academicYear: data.academicYear,
      course: {
        connect: { id: data.courseId }
      }
    }
  });

  res.status(201).json({ message: "Semester created successfully" });
})

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
