import Combobox from "../ui/Combobox"
import { formatDateBR } from "@/lib/utils/date"

type Props = {
  tipo: string
  vencimentos: string[]
  value: string
  onChange: (value: string) => void
}

export default function VencimentoSelect({
  tipo,
  vencimentos,
  value,
  onChange,
}: Props) {
  /**
   * Transform ISO dates into label/value pairs
   */
  const options = vencimentos.map((v) => ({
    value: v,                 // stays ISO
    label: formatDateBR(v),   // user-friendly
  }))

  return (
    <Combobox
      label="Vencimento"
      name="vencimento"
      options={options}
      value={value}
      onChange={onChange}
      placeholder={
        !tipo ? "Selecione um tipo primeiro" : "Digite ou selecione..."
      }
      disabled={!tipo}
    />
  )
}