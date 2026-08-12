import { Router } from 'express';
import { listBrands, listCities, listProvinces, listVehicleTypes } from '../services/catalog.js';

/**
 * El catálogo: qué tipos de vehículo existen y qué campos pide cada uno.
 *
 * Es lo que hace que el formulario de carga se arme solo. No hay ninguna lista
 * de tipos escrita en el código — todo sale de la base.
 */
export const catalogRouter = Router();

catalogRouter.get('/vehicle-types', async (_req, res) => {
  res.json({ vehicle_types: await listVehicleTypes() });
});

catalogRouter.get('/provinces', async (_req, res) => {
  res.json({ provinces: await listProvinces() });
});

catalogRouter.get('/cities', async (_req, res) => {
  res.json({ cities: await listCities() });
});

catalogRouter.get('/brands', async (_req, res) => {
  res.json({ brands: await listBrands() });
});
