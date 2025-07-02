import { Provider } from '@prisma/client';
import z from 'zod';

export const userSchema = z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string().optional(),
    provider: z.nativeEnum(Provider)

})


export type userSchema = z.infer<typeof userSchema>