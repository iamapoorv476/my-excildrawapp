
import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";

export function middleware(req: Request, res: Response, next: NextFunction) {
    const token = req.headers["authorization"] ?? "";

    if (!token) {
        res.status(403).json({
            message: "Unauthorized - No token provided"
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
       
        if (typeof decoded !== 'string' && decoded && 'userId' in decoded) {
            req.userId = decoded.userId as string;
            next();
        } else {
            res.status(403).json({
                message: "Unauthorized - Invalid token format"
            });
        }
    } catch (error) {
        res.status(403).json({
            message: "Unauthorized - Invalid token"
        });
    }
}