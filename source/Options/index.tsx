import React from "react"
import ReactDOM from "react-dom"

import optionsStorage from "Common/Options"

export const OptionsForm: React.FC = () => {
    return (
        <form>
            <label htmlFor="excludelist">
                Ignore pages from the following domains:
            </label>
            <br />
            <textarea
                id="excludelist"
                name="excludelist"
                spellCheck="false"
                autoComplete="off"
                rows={10}
            />
        </form>
    )
}

ReactDOM.render(<OptionsForm />, document.getElementById("options"))
optionsStorage.syncForm(document.querySelector("form")!)
