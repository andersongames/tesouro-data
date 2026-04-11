import Combobox from "../ui/Combobox"

type Props = {
  tipos: string[]
  value: string
  onChange: (value: string) => void
}

export default function TipoSelect({
  tipos,
  value,
  onChange,
}: Props) {
  const options = tipos.map((v) => ({
    value: v,
    label: v,
  }))

  return (
    <Combobox
      label="Tipo"
      name="tipo"
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Digite ou selecione..."
    />
  )
}