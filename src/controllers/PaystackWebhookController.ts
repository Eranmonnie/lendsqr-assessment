
import { StatusCodes } from "http-status-codes";
import { env } from "../config/env";
import { Request, Response } from "express";
import * as crypto from "crypto";
import { webhookService } from "../services/WebhookService";
import { logger } from "../config/logger";
import { webhookRepository } from "../repositories/WebhookRepository";

export class PaystackWebhookController {

    /**
      * Paystack Webhook Handler
      */
    async paystackWebhook(req: Request, res: Response) {
        try {
            const payload = (req as any).rawBody || JSON.stringify(req.body);

            // Verify the signature
            const hash = crypto
                .createHmac('sha512', env.paystack.secretKey)
                .update(payload)
                .digest('hex');

            if (hash !== req.headers['x-paystack-signature']) {
                return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid signature' });
            }

            logger.info('Webhook received:', {
                event: req.body.event,
                reference: req.body.data.reference
            });

            const duplicateWebhook = await webhookRepository.findByReference(req.body.data.reference);
            if (duplicateWebhook) {
                logger.info('Webhook already exists:', { reference: req.body.data.reference });
                return res.sendStatus(StatusCodes.OK);
            }

            await webhookRepository.create({
                reference: req.body.data.reference,
                type: req.body.event,
                status: 'PROCESSING',
                payload,
            });
            logger.info('Webhook saved:', { reference: req.body.data.reference });


            const event = req.body;

            if (event.event === 'charge.success') {
                logger.info('Handling charge.success event for reference:', { reference: event.data.reference });
                await webhookService.handlePaystackChargeSuccess(event);
            }

            if (event.event === 'transfer.success') {
                logger.info('Handling transfer.success event for reference:', { reference: event.data.reference });
                await webhookService.handlePaystackTransferSuccess(event);
            }

            if (event.event === 'transfer.failed') {
                logger.info('Handling transfer.failed event for reference:', { reference: event.data.reference });
                await webhookService.handlePaystackTransferFailed(event);
            }

            return res.sendStatus(StatusCodes.OK);
        } catch (error: any) {
            logger.error('Webhook error:', error);
            return res.sendStatus(StatusCodes.OK)
        }
    }
}

export const paystackWebhookController = new PaystackWebhookController();