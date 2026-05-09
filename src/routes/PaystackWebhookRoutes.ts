import { paystackWebhookController } from "@/controllers/PaystackWebhookController";
import { Router } from "express";


const router = Router();

router.post('/webhook', paystackWebhookController.paystackWebhook);

export default router;