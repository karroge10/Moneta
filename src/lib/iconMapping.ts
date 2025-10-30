import React from 'react';
import {
  FireFlame,
  Tv,
  Wifi,
  Shirt,
  CoffeeCup,
  Cart,
  SmartphoneDevice,
  Airplane,
  BitcoinCircle,
  Neighbourhood,
  Cash,
  City,
  NavArrowRight,
  NavArrowLeft,
} from 'iconoir-react';

const iconMap: Record<string, React.ComponentType<{ width?: number; height?: number; strokeWidth?: number; style?: React.CSSProperties }>> = {
  FireFlame,
  Tv,
  Wifi,
  Shirt,
  CoffeeCup,
  Cart,
  SmartphoneDevice,
  Airplane,
  BitcoinCircle,
  Neighbourhood,
  Cash,
  City,
  NavArrowRight,
  NavArrowLeft,
};

export function getIcon(iconName: string) {
  return iconMap[iconName] || CoffeeCup;
}

