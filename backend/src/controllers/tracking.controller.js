const prisma = require('../utils/prismaClient');
const { EventEmitter } = require('events');

// Simple in-memory store and event emitter for realtime updates
const emitter = new EventEmitter();
const latestByVehicle = new Map();

const simulateUpdate = (data) => {
    const { vehicleId, lat, lng, speed, timestamp } = data;
    const payload = {
        vehicleId,
        lat: Number(lat),
        lng: Number(lng),
        speed: speed || 0,
        assignedDriver: data.assignedDriver || 'N/A',
        isDelivery: data.isDelivery || false,
        deliveryStatus: data.deliveryStatus || null,
        timestamp: timestamp || Date.now()
    };
    latestByVehicle.set(vehicleId, payload);
    emitter.emit('update', payload);
    return payload;
};

const postSimulate = async (req, res, next) => {
    try {
        const body = req.body || {};
        if (!body.vehicleId || body.lat === undefined || body.lng === undefined) {
            return res.status(400).json({ message: 'vehicleId, lat and lng are required' });
        }

        // Dynamically resolve actual driver/customer and delivery status from DB
        let assignedDriver = body.assignedDriver || 'N/A';
        let isDelivery = body.isDelivery || false;
        let deliveryStatus = null;

        try {
            const activeBooking = await prisma.booking.findFirst({
                where: {
                    car: { plateNumber: body.vehicleId },
                    OR: [
                        { status: 'ACTIVE' },
                        { status: 'PAID' },
                        {
                            delivery: {
                                status: {
                                    in: ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'DELIVERED']
                                }
                            }
                        }
                    ]
                },
                include: {
                    user: {
                        include: {
                            customerProfile: true
                        }
                    },
                    delivery: {
                        include: {
                            driver: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            if (activeBooking) {
                isDelivery = activeBooking.isDelivery;
                deliveryStatus = activeBooking.delivery ? activeBooking.delivery.status : null;
                if (activeBooking.isDelivery) {
                    if (activeBooking.delivery && activeBooking.delivery.status === 'DELIVERED') {
                        assignedDriver = activeBooking.user && activeBooking.user.customerProfile
                            ? `${activeBooking.user.customerProfile.firstName} ${activeBooking.user.customerProfile.lastName}`
                            : 'Customer';
                    } else if (activeBooking.delivery && activeBooking.delivery.driver) {
                        assignedDriver = activeBooking.delivery.driver.fullName;
                    }
                } else {
                    assignedDriver = activeBooking.assignedDriver || 'No driver assigned';
                }
            }
        } catch (dbErr) {
            console.error('Failed to resolve dynamic properties during simulate update:', dbErr);
        }

        body.assignedDriver = assignedDriver;
        body.isDelivery = isDelivery;
        body.deliveryStatus = deliveryStatus;

        const payload = simulateUpdate(body);
        return res.json({ success: true, data: payload });
    } catch (err) {
        next(err);
    }
};

const getLatest = async (req, res) => {
    const { vehicleId } = req.params;
    if (!vehicleId) return res.status(400).json({ message: 'vehicleId required' });
    const data = latestByVehicle.get(vehicleId) || null;
    res.json({ data });
};

const getActiveVehicles = async (req, res, next) => {
    try {
        const now = new Date();
        const thirtyMinsFromNow = new Date(now.getTime() + 30 * 60 * 1000);

        const activeBookings = await prisma.booking.findMany({
            where: {
                OR: [
                    { status: 'ACTIVE' },
                    {
                        status: 'PAID',
                        isDelivery: true,
                        startDate: { lte: thirtyMinsFromNow }
                    },
                    {
                        delivery: {
                            status: {
                                in: ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'DELIVERED']
                            }
                        }
                    }
                ]
            },
            include: { 
                car: true,
                user: {
                    include: {
                        customerProfile: true
                    }
                },
                delivery: {
                    include: {
                        driver: true
                    }
                }
            }
        });

        const vehicles = activeBookings
            .filter(b => b.car && b.car.plateNumber)
            .map(b => {
                let assignedDriver = 'No driver assigned';
                if (b.isDelivery) {
                    if (b.delivery && b.delivery.status === 'DELIVERED') {
                        assignedDriver = b.user && b.user.customerProfile 
                            ? `${b.user.customerProfile.firstName} ${b.user.customerProfile.lastName}` 
                            : 'Customer';
                    } else if (b.delivery && b.delivery.driver) {
                        assignedDriver = b.delivery.driver.fullName;
                    }
                } else {
                    assignedDriver = b.assignedDriver || 'No driver assigned';
                }

                return {
                    vehicleId: b.car.plateNumber,
                    bookingId: b.id,
                    carModel: `${b.car.make} ${b.car.model}`,
                    pickupLocation: b.isDelivery ? "Teddy Car Rental Main Office" : b.pickupLocation,
                    deliveryLocation: b.isDelivery ? b.pickupLocation : (b.delivery ? b.delivery.deliveryLocation : null),
                    startDate: b.startDate,
                    endDate: b.endDate,
                    isDelivery: b.isDelivery,
                    status: b.status,
                    assignedDriver,
                    deliveryStatus: b.delivery ? b.delivery.status : null
                };
            });

        res.json({ success: true, data: vehicles });
    } catch (err) {
        next(err);
    }
};

const stream = (req, res) => {
    // SSE headers
    res.writeHead(200, {
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache'
    });

    const send = (payload) => {
        res.write(`event: update\n`);
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    const listener = (payload) => send(payload);
    emitter.on('update', listener);

    // Send current snapshot
    for (const v of latestByVehicle.values()) send(v);

    req.on('close', () => {
        emitter.removeListener('update', listener);
    });
};

module.exports = {
    postSimulate,
    getLatest,
    getActiveVehicles,
    stream,
    // expose simulateUpdate for internal scripts
    simulateUpdate
};
