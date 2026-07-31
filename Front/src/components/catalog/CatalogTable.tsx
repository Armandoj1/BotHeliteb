import {
  Badge,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
  Tooltip,
} from '@/components/ui';
import {
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUS_TONES,
  describeStock,
} from '@/features/catalog/labels';
import type { IProduct } from '@/types';
import { formatCurrency, formatNumber } from '@/utils/format-number';
import { formatRelativeTime } from '@/utils/format-date';

export interface ICatalogTableProps {
  products: readonly IProduct[];
  onToggleAi: (product: IProduct, enabled: boolean) => void;
}

export function CatalogTable({ products, onToggleAi }: ICatalogTableProps) {
  return (
    <TableWrapper>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead align="right">Precio</TableHead>
            <TableHead align="right">Existencias</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead align="center">IA</TableHead>
            <TableHead align="right">Actualizado</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {products.map((product) => {
            const stock = describeStock(product.stock);

            return (
              <TableRow key={product.id}>
                <TableCell className="max-w-sm">
                  <p className="truncate font-medium text-foreground">{product.name}</p>
                  <p className="truncate font-mono text-[11px] text-subtle">{product.sku}</p>
                </TableCell>

                <TableCell className="text-muted">{product.category}</TableCell>

                <TableCell align="right" className="font-medium" data-numeric>
                  {formatCurrency(product.price, product.currency)}
                </TableCell>

                <TableCell align="right">
                  <span className="inline-flex items-center gap-2">
                    <span className="text-muted" data-numeric>
                      {formatNumber(product.stock)}
                    </span>
                    <Badge tone={stock.tone} size="sm">
                      {stock.label}
                    </Badge>
                  </span>
                </TableCell>

                <TableCell>
                  <Badge tone={PRODUCT_STATUS_TONES[product.status]} withDot>
                    {PRODUCT_STATUS_LABELS[product.status]}
                  </Badge>
                </TableCell>

                <TableCell align="center">
                  <Tooltip
                    content={
                      product.aiEnabled
                        ? 'El asistente puede cotizar este producto'
                        : 'El asistente omitirá este producto'
                    }
                    side="left"
                  >
                    <span className="inline-flex">
                      <Switch
                        checked={product.aiEnabled}
                        onCheckedChange={(checked) => onToggleAi(product, checked)}
                        aria-label={`Habilitar ${product.name} para el asistente`}
                      />
                    </span>
                  </Tooltip>
                </TableCell>

                <TableCell align="right" className="whitespace-nowrap text-subtle">
                  {formatRelativeTime(product.updatedAt)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}
