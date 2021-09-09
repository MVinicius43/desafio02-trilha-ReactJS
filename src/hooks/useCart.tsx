import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
  type: string;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount, type }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updateCart = [...cart]
      const productExist = updateCart.find(product => product.id === productId)

      const stock = await api.get(`stock/${productId}`)

      const stockAmount = stock.data.amount
      const currentAmount = productExist ? productExist.amount : 0
      const amount = currentAmount + 1

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora do estoque')
        return;
      }

      if (productExist) {
        productExist.amount = amount
      } else {
        const product = await api.get(`products/${productId}`)

        const newProduct = {
          ...product.data,
          amount: 1
        }

        updateCart.push(newProduct)
      }

      setCart(updateCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart))
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart]

      newCart.map((product, index) => {
        if (productId === product.id) {
          newCart.splice(index, 1)
        }
      })
      
      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
    type
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const newCart = [...cart]
      const stock = await api.get(`stock/${productId}`)
      const stockAmount = stock.data.amount
      
      if (type === 'increment') {
        if (amount < stockAmount) {
          newCart.map((product, index) => {
            if (productId === product.id) {
              newCart[index].amount++
            }
          })
        } else {
          toast.error('Quantidade solicitada fora do estoque')
          return;
        }
      } else {
        newCart.map((product, index) => {
          if (productId === product.id) {
            newCart[index].amount--
          }
        })
      }
      
      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
