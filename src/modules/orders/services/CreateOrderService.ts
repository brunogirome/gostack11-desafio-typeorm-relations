import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exist');
    }

    const findProducts = await this.productsRepository.findAllById(
      products.map(product => ({
        id: product.id,
      })),
    );

    if (findProducts.length !== products.length) {
      throw new AppError('One or more products does not exists.');
    }

    const productsOrder = findProducts.map(findProduct => {
      const productIndex = products.findIndex(
        product => product.id === findProduct.id,
      );

      const { quantity } = products[productIndex];

      if (findProduct.quantity < quantity) {
        throw new AppError('Invalid product quantity.');
      }

      const { id: product_id, price } = findProduct;

      return {
        product_id,
        quantity,
        price,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: productsOrder,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
