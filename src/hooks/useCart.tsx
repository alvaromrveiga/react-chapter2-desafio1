import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => void;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = (productId: number) => {
    try {
      api
        .get(`/stock/${productId}`)
        .then((stockResponse) => {
          if (stockResponse.data.amount <= 0) {
            toast.error("Quantidade solicitada fora de estoque");
            return;
          }

          api
            .get(`/products/${productId}`)
            .then((productsResponse) => {
              if (!productsResponse.data) {
                throw new Error();
              }

              const newCart = [...cart];

              const productIndex = newCart.findIndex((product) => {
                return product.id === stockResponse.data.id;
              });

              if (productIndex >= 0) {
                if (stockResponse.data.amount <= newCart[productIndex].amount) {
                  toast.error("Quantidade solicitada fora de estoque");
                  return;
                }
                newCart[productIndex].amount++;
              } else {
                newCart.push({ ...productsResponse.data, amount: 1 });
              }

              setCart(newCart);
              localStorage.setItem(
                "@RocketShoes:cart",
                JSON.stringify(newCart)
              );
            })
            .catch(() => {
              toast.error("Erro na adição do produto");
            });
        })
        .catch(() => {
          toast.error("Erro na adição do produto");
        });
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart];

      const productIndex = newCart.findIndex((product) => {
        return product.id === productId;
      });

      if (productIndex === -1) {
        throw new Error();
      }

      newCart.splice(productIndex, 1);
      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = ({ productId, amount }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      api
        .get(`/stock/${productId}`)
        .then((response) => {
          if (response.data.amount < amount) {
            toast.error("Quantidade solicitada fora de estoque");
            return;
          }

          const newCart = [...cart];

          const productIndex = newCart.findIndex((product) => {
            return product.id === productId;
          });

          newCart[productIndex].amount = amount;

          setCart(newCart);
          localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
        })
        .catch(() => {
          toast.error("Erro na alteração de quantidade do produto");
        });
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
